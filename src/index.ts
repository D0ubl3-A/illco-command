import path from "path";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { randomUUID } from "crypto";
import Redis from "ioredis";
import { config } from "./config";
import { ViewerMessageInput, ProducerStatusEvent } from "./types";
import { setMessageState, logModerationDecision, initStorage, appendTranscript } from "./db";
import { FixedWindowRateLimiter, reserveIdempotentMessageId } from "./services/rateLimiter";
import { runModeration } from "./services/moderation";
import { AIService } from "./services/ai";
import { Orchestrator } from "./services/orchestrator";
import { QueueManager } from "./services/queueManager";
import { createProducerGateway } from "./services/producerSocket";

async function main() {
  await initStorage();

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: { origin: config.corsOrigin },
  });

  const redis = new Redis(config.redisUrl);
  const adapterPub = createClient({ url: config.redisUrl });
  const adapterSub = adapterPub.duplicate();
  await Promise.all([adapterPub.connect(), adapterSub.connect()]);
  io.adapter(createAdapter(adapterPub, adapterSub));

  const redisViewerLimiter = new FixedWindowRateLimiter(redis, 60);

  const ai = new AIService();
  const orchestrator = new Orchestrator(redis, ai, (channelId, payload) => {
    io.of("/producer").to(`producer:${channelId}`).emit(`channel:${channelId}:speak`, payload);
  });

  const queueManager = new QueueManager(redis, orchestrator);

  async function nowState(channelId: string) {
    const runtime = await orchestrator.getChannelState(channelId);
    const queue = await queueManager.getChannelStats(channelId);
    return {
      runtime,
      queue,
    };
  }

  function isControlAdminAuthorized(req: express.Request) {
    if (!config.controlAdminToken) {
      return true;
    }
    const headerToken =
      req.headers["x-control-admin-token"] || req.headers["x-admin-token"];
    const queryToken = req.query.adminToken;
    const token = String(headerToken || queryToken || "");
    return token === config.controlAdminToken;
  }

  function isProducerEventAuthorized(req: express.Request, channelId: string) {
    const secret = String(req.headers["x-internal-secret"] || "");
    if (secret === config.internalEventSecret) {
      return true;
    }

    const authHeader = String(req.headers.authorization || "");
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7)
      : "";
    const token = bearerToken || String(req.query.token || "");
    if (!token) {
      return false;
    }

    try {
      const payload = jwt.verify(token, config.producerTokenSecret) as {
        channelId: string;
        role?: string;
      };
      return payload.channelId === channelId && payload.role === "producer";
    } catch {
      return false;
    }
  }

  const producerGateway = createProducerGateway(
    io,
    (event: ProducerStatusEvent) => orchestrator.handleProducerStatus(event),
    (channelId, connected) => orchestrator.setProducerConnected(channelId, connected),
    (channelId) => orchestrator.setProducerHeartbeat(channelId),
    nowState
  );

  app.use(express.json({ limit: "1mb" }));
  app.use("/public", express.static(path.join(__dirname, "../public")));

  app.get("/producer/channel/:channelId", (req, res) => {
    const { channelId } = req.params;
    const token = String(req.query.token || "");
    try {
      const payload = jwt.verify(token, config.producerTokenSecret) as { channelId: string };
      if (payload.channelId !== channelId) {
        return res.status(401).json({ error: "token_channel_mismatch" });
      }
    } catch {
      return res.status(401).json({ error: "invalid_or_missing_producer_token" });
    }
    return res.sendFile(path.join(__dirname, "../public/producer.html"));
  });

  app.get("/api/channels/:channelId/producer-token", (req, res) => {
    if (!isControlAdminAuthorized(req)) {
      return res.status(401).json({ error: "invalid_admin_token" });
    }
    const { channelId } = req.params;
    const token = producerGateway.createProducerToken(channelId);
    res.json({
      channelId,
      url: `${config.producerBaseUrl}${config.producerRoute}/${channelId}?token=${encodeURIComponent(token)}`,
      token,
      expiresInSec: config.producerTokenTtlSec,
    });
  });

  app.get("/api/channels/:channelId/health", async (req, res) => {
    const { channelId } = req.params;
    const queue = await queueManager.getChannelStats(channelId);
    const runtime = await orchestrator.getChannelState(channelId);
    res.json({
      channelId,
      runtime,
      queue,
    });
  });

  const messageSchema = z.object({
    viewerId: z.string().min(1).max(128),
    message: z.string().min(1).max(500),
    locale: z.string().optional(),
    intentHint: z.string().optional(),
    idempotencyKey: z.string().optional(),
  });

  const controlSchema = z.object({
    command: z.enum(["skip", "stop", "mute", "unmute"]),
    reason: z.string().max(240).optional(),
  });

  app.post("/api/channels/:channelId/control", async (req, res) => {
    if (!isControlAdminAuthorized(req)) {
      return res.status(401).json({ error: "invalid_admin_token" });
    }

    const { channelId } = req.params;
    const parse = controlSchema.safeParse(req.body || {});
    if (!parse.success) {
      return res.status(400).json({ error: "invalid_payload", details: parse.error.flatten() });
    }

    const reason = parse.data.reason || `host_${parse.data.command}`;
    if (parse.data.command === "mute") {
      return res.json(await orchestrator.setChannelMuted(channelId, true, reason));
    }
    if (parse.data.command === "unmute") {
      return res.json(await orchestrator.setChannelMuted(channelId, false, reason));
    }
    if (parse.data.command === "stop") {
      const muted = await orchestrator.setChannelMuted(channelId, true, reason);
      const skipped = await orchestrator.skipCurrent(channelId, reason);
      return res.json({ channelId, muted, skipped });
    }

    return res.json(await orchestrator.skipCurrent(channelId, reason));
  });

  app.post("/api/channels/:channelId/messages", async (req, res) => {
    const { channelId } = req.params;
    const parse = messageSchema.safeParse(req.body || {});
    if (!parse.success) {
      return res.status(400).json({ error: "invalid_payload", details: parse.error.flatten() });
    }
    const input = parse.data as ViewerMessageInput;
    let messageId: string = randomUUID();
    const createdAt = new Date().toISOString();

    if (input.idempotencyKey) {
      const cacheKey = `${channelId}:${input.viewerId}:${input.idempotencyKey}`;
      const reserved = await reserveIdempotentMessageId(redis, cacheKey, messageId);
      if (reserved.mode === "duplicate") {
        return res.status(200).json({
          messageId: reserved.messageId,
          status: "duplicate",
          queuePosition: 0,
          cooldownMs: config.cooldownMs,
        });
      }
      messageId = reserved.messageId;
    }

    const viewerLimit = await redisViewerLimiter.consume(
      `viewer:${channelId}:${input.viewerId}`,
      config.viewerBucketPerMin
    );
    if (!viewerLimit.allowed) {
      return res.status(429).json({
        status: "rejected",
        reason: "viewer_rate_limit",
        retryAfterMs: viewerLimit.retryAfterMs,
      });
    }
    const channelLimit = await redisViewerLimiter.consume(`channel:${channelId}`, config.channelBucketPerMin);
    if (!channelLimit.allowed) {
      return res.status(429).json({
        status: "rejected",
        reason: "channel_rate_limit",
        retryAfterMs: channelLimit.retryAfterMs,
      });
    }

    await setMessageState(messageId, channelId, input.viewerId, input.message, "received");
    const moderation = await runModeration({
      channelId,
      viewerId: input.viewerId,
      message: input.message,
    });
    await logModerationDecision(messageId, {
      channelId,
      viewerId: input.viewerId,
      message: input.message,
      decision: moderation.decision,
      riskScore: moderation.riskScore,
      matchedRules: moderation.matchedRules,
      reason: moderation.reason,
      policyVersion: moderation.policyVersion,
      cooldownMs: moderation.cooldownMs,
    });

    if (moderation.decision === "reject") {
      await setMessageState(messageId, channelId, input.viewerId, input.message, "rejected", {
        moderation,
      });
      return res.status(400).json({
        messageId,
        status: "rejected",
        moderation,
      });
    }

    if (moderation.decision === "cooldown") {
      await setMessageState(messageId, channelId, input.viewerId, input.message, "accepted", {
        moderation,
        cooldownMs: moderation.cooldownMs,
      });
      return res.status(429).json({
        messageId,
        status: "cooldown",
        moderation,
        cooldownMs: moderation.cooldownMs,
      });
    }

    await setMessageState(messageId, channelId, input.viewerId, input.message, "accepted");
    await appendTranscript(
      {
        messageId,
        channelId,
        viewerId: input.viewerId,
        message: input.message,
        locale: input.locale,
        intentHint: input.intentHint,
        createdAt,
      },
      "viewer",
      input.message
    );

    const enqueueResult = await queueManager.enqueue(channelId, {
      messageId,
      channelId,
      viewerId: input.viewerId,
      message: input.message,
      locale: input.locale,
      intentHint: input.intentHint,
      createdAt,
    });

    if (!enqueueResult.ok) {
      await setMessageState(messageId, channelId, input.viewerId, input.message, "failed", {
        reason: "queue_full",
      });
      return res.status(429).json({ messageId, status: "rejected", reason: enqueueResult.reason });
    }

    await setMessageState(messageId, channelId, input.viewerId, input.message, "queued", {
      jobId: enqueueResult.jobId,
    });

    return res.status(202).json({
      messageId,
      status: "queued",
      queuePosition: enqueueResult.queuePosition || 0,
      cooldownMs: config.cooldownMs,
    });
  });

  app.post("/api/producers/:channelId/events", async (req, res) => {
    const { channelId } = req.params;
    if (!isProducerEventAuthorized(req, channelId)) {
      return res.status(401).json({ error: "invalid_producer_event_auth" });
    }
    const event = req.body as ProducerStatusEvent;
    if (!event?.messageId || event.channelId !== channelId || !event.type) {
      return res.status(400).json({ error: "invalid_event_payload" });
    }
    await orchestrator.handleProducerStatus(event);
    res.json({ ok: true });
  });

  app.get("/health", async (_, res) => {
    res.json({ ok: true, now: new Date().toISOString() });
  });

  app.get("/", (_, res) => {
    res.json({
      status: "live-control-plane-mvp",
      instructions: {
        messages: "POST /api/channels/{channelId}/messages",
        health: "GET /api/channels/{channelId}/health",
        producer: "GET /api/channels/{channelId}/producer-token",
        producerPage: "/producer/channel/{channelId}?token=...",
      },
    });
  });

  server.listen(config.port, () => {
    console.log(`live-control-plane listening on :${config.port}`);
  });
}
main().catch((error) => {
  console.error("failed to start", error);
  process.exit(1);
});
