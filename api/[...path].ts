import express from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import Redis from "ioredis";
import { z } from "zod";
import { config } from "../src/config";
import { MessageJobData, ProducerSpeakCommand, ProducerStatusEvent, ViewerMessageInput } from "../src/types";
import { appendTranscript, initStorage, logModerationDecision, setMessageState } from "../src/db";
import { AIService } from "../src/services/ai";
import { runModeration } from "../src/services/moderation";
import { FixedWindowRateLimiter, reserveIdempotentMessageId } from "../src/services/rateLimiter";

interface CurrentTurn {
  job: MessageJobData;
  command: ProducerSpeakCommand;
  attempt: "primary" | "fallback";
  expiresAtMs: number;
}

let redis: Redis | null = null;
let storageInit: Promise<void> | null = null;
let redisUnavailableMessage: string | null = null;
const ai = new AIService();

function redisClient() {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
    });
  }
  return redis;
}

function redisConfigured() {
  const value = process.env.REDIS_URL || "";
  return Boolean(value) && !/^redis:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/i.test(value);
}

async function requireRedis(res: express.Response) {
  if (redisConfigured()) {
    const client = redisClient();
    try {
      await client.ping();
      redisUnavailableMessage = null;
      return client;
    } catch (error) {
      redisUnavailableMessage = String((error as Error)?.message || error);
      console.error("redis unavailable", redisUnavailableMessage);
      redis = null;
      res.status(503).json({
        error: "redis_unavailable",
        message: "Redis is not reachable. Check REDIS_URL connectivity and credentials.",
        detail: redisUnavailableMessage,
      });
      return null;
    }
  }

  res.status(503).json({
    error: "missing_redis_url",
    message: "Set REDIS_URL in Vercel before using queue, producer, control, or channel health endpoints.",
  });
  return null;
}

async function ensureStorage() {
  if (!storageInit) {
    storageInit = initStorage()
      .then(() => undefined)
      .catch((error) => {
        console.error("storage init failed", String((error as Error)?.message || error));
      });
  }
  await storageInit;
}

function queueKey(channelId: string) {
  return `vercel:channel:${channelId}:queue`;
}

function currentKey(channelId: string) {
  return `vercel:channel:${channelId}:current`;
}

function claimKey(channelId: string) {
  return `vercel:channel:${channelId}:claim`;
}

function muteKey(channelId: string) {
  return `channel:${channelId}:muted`;
}

function commandFor(job: MessageJobData, text: string, attempt: "primary" | "fallback"): ProducerSpeakCommand {
  return {
    messageId: job.messageId,
    commandId: `${job.messageId}:${attempt}`,
    channelId: job.channelId,
    text,
    attempt,
    voiceProfile: "alex",
    ttsStyle: "neutral",
    generatedAt: new Date().toISOString(),
    ttlMs: Math.max(1000, config.speakTimeoutMs),
    timeoutMs: config.speakTimeoutMs,
  };
}

function isAdminAuthorized(req: express.Request) {
  if (!config.controlAdminToken) {
    return true;
  }
  const token = String(
    req.headers["x-control-admin-token"] || req.headers["x-admin-token"] || req.query.adminToken || ""
  );
  return token === config.controlAdminToken;
}

function isProducerAuthorized(req: express.Request, channelId: string) {
  const secret = String(req.headers["x-internal-secret"] || "");
  if (secret === config.internalEventSecret) {
    return true;
  }

  const authHeader = String(req.headers.authorization || "");
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
  const token = bearerToken || String(req.query.token || "");
  if (!token) {
    return false;
  }

  try {
    const payload = jwt.verify(token, config.producerTokenSecret) as { channelId: string; role?: string };
    return payload.channelId === channelId && payload.role === "producer";
  } catch {
    return false;
  }
}

function baseUrlFor(req: express.Request) {
  if (process.env.PRODUCER_BASE_URL) {
    return process.env.PRODUCER_BASE_URL;
  }
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
  return `${proto}://${req.headers.host}`;
}

async function getCurrentTurn(channelId: string, client: Redis): Promise<CurrentTurn | null> {
  const raw = await client.get(currentKey(channelId));
  if (!raw) {
    return null;
  }

  try {
    const turn = JSON.parse(raw) as CurrentTurn;
    if (turn.expiresAtMs > Date.now()) {
      return turn;
    }

    await setMessageState(turn.job.messageId, channelId, turn.job.viewerId, turn.job.message, "failed", {
      reason: "producer_ack_timeout",
    });
    await setMessageState(turn.job.messageId, channelId, turn.job.viewerId, turn.job.message, "archived", {
      finalStatus: "failed",
      reason: "producer_ack_timeout",
    });
    await client.del(currentKey(channelId));
    return null;
  } catch {
    await client.del(currentKey(channelId));
    return null;
  }
}

async function saveCurrentTurn(turn: CurrentTurn) {
  const client = redisClient();
  await client.set(currentKey(turn.job.channelId), JSON.stringify(turn));
}

async function failCurrentTurn(channelId: string, reason: string, client: Redis) {
  const turn = await getCurrentTurn(channelId, client);
  if (!turn) {
    return { channelId, skipped: false, messageId: null };
  }

  await setMessageState(turn.job.messageId, channelId, turn.job.viewerId, turn.job.message, "failed", { reason });
  await setMessageState(turn.job.messageId, channelId, turn.job.viewerId, turn.job.message, "archived", {
    finalStatus: "failed",
    reason,
  });
  await client.del(currentKey(channelId));
  return { channelId, skipped: true, messageId: turn.job.messageId };
}

function asyncRoute(handler: express.RequestHandler): express.RequestHandler {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

const app = express();
const jsonParser = express.json({ limit: "1mb" });

app.use((req, res, next) => {
  res.setHeader("access-control-allow-origin", config.corsOrigin);
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader(
    "access-control-allow-headers",
    "authorization,content-type,x-admin-token,x-control-admin-token,x-internal-secret"
  );
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  return next();
});

app.use((req, res, next) => {
  jsonParser(req, res, (error) => {
    if (!error) {
      return next();
    }
    if (error instanceof SyntaxError && String(error.status) === "400") {
      return res.status(400).json({
        error: "invalid_json",
        message: "Request body must be valid JSON.",
      });
    }
    return next(error);
  });
});

app.get("/api/health", asyncRoute(async (_req, res) => {
  await ensureStorage();
  res.json({
    ok: true,
    mode: "vercel-http",
    redisConfigured: redisConfigured(),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    now: new Date().toISOString(),
  });
}));

app.get("/api/channels/:channelId/producer-token", asyncRoute(async (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: "invalid_admin_token" });
  }

  const { channelId } = req.params;
  const token = jwt.sign({ channelId, role: "producer" }, config.producerTokenSecret, {
    expiresIn: config.producerTokenTtlSec,
  });

  res.json({
    channelId,
    url: `${baseUrlFor(req)}${config.producerRoute}/${channelId}?token=${encodeURIComponent(token)}`,
    token,
    expiresInSec: config.producerTokenTtlSec,
  });
}));

app.get("/api/channels/:channelId/health", asyncRoute(async (req, res) => {
  await ensureStorage();
  const client = await requireRedis(res);
  if (!client) {
    return;
  }
  const { channelId } = req.params;
  const current = await getCurrentTurn(channelId, client);
  const muted = await client.get(muteKey(channelId));

  res.json({
    channelId,
    runtime: {
      mode: "vercel-http",
      muted: Boolean(muted),
      muteReason: muted,
      status: current ? current.attempt === "fallback" ? "fallback" : "speaking" : "idle",
      currentMessageId: current?.job.messageId || null,
      currentAttempt: current?.attempt || null,
    },
    queue: {
      waiting: await client.llen(queueKey(channelId)),
      active: current ? 1 : 0,
    },
  });
}));

const messageSchema = z.object({
  viewerId: z.string().min(1).max(128),
  message: z.string().min(1).max(500),
  locale: z.string().optional(),
  intentHint: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

app.post("/api/channels/:channelId/messages", asyncRoute(async (req, res) => {
  await ensureStorage();
  const client = await requireRedis(res);
  if (!client) {
    return;
  }
  const { channelId } = req.params;
  const parse = messageSchema.safeParse(req.body || {});
  if (!parse.success) {
    return res.status(400).json({ error: "invalid_payload", details: parse.error.flatten() });
  }

  const input = parse.data as ViewerMessageInput;
  const limiter = new FixedWindowRateLimiter(client, 60);
  let messageId: string = randomUUID();
  const createdAt = new Date().toISOString();

  if (await client.get(muteKey(channelId))) {
    return res.status(423).json({ status: "rejected", reason: "channel_muted" });
  }

  if (input.idempotencyKey) {
    const cacheKey = `${channelId}:${input.viewerId}:${input.idempotencyKey}`;
    const reserved = await reserveIdempotentMessageId(client, cacheKey, messageId);
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

  const viewerLimit = await limiter.consume(`viewer:${channelId}:${input.viewerId}`, config.viewerBucketPerMin);
  if (!viewerLimit.allowed) {
    return res.status(429).json({
      status: "rejected",
      reason: "viewer_rate_limit",
      retryAfterMs: viewerLimit.retryAfterMs,
    });
  }

  const channelLimit = await limiter.consume(`channel:${channelId}`, config.channelBucketPerMin);
  if (!channelLimit.allowed) {
    return res.status(429).json({
      status: "rejected",
      reason: "channel_rate_limit",
      retryAfterMs: channelLimit.retryAfterMs,
    });
  }

  await setMessageState(messageId, channelId, input.viewerId, input.message, "received");
  const moderation = await runModeration({ channelId, viewerId: input.viewerId, message: input.message });
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
    await setMessageState(messageId, channelId, input.viewerId, input.message, "rejected", { moderation });
    return res.status(400).json({ messageId, status: "rejected", moderation });
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

  const waiting = await client.llen(queueKey(channelId));
  const current = await getCurrentTurn(channelId, client);
  if (waiting + (current ? 1 : 0) >= config.queueMaxLen) {
    await setMessageState(messageId, channelId, input.viewerId, input.message, "failed", {
      reason: "queue_full",
    });
    return res.status(429).json({ messageId, status: "rejected", reason: "queue_full" });
  }

  const job: MessageJobData = {
    messageId,
    channelId,
    viewerId: input.viewerId,
    message: input.message,
    locale: input.locale,
    intentHint: input.intentHint,
    createdAt,
  };

  await setMessageState(messageId, channelId, input.viewerId, input.message, "accepted");
  await appendTranscript(job, "viewer", input.message);
  await client.rpush(queueKey(channelId), JSON.stringify(job));
  await setMessageState(messageId, channelId, input.viewerId, input.message, "queued");

  return res.status(202).json({
    messageId,
    status: "queued",
    queuePosition: waiting + (current ? 1 : 0) + 1,
    cooldownMs: config.cooldownMs,
  });
}));

app.get("/api/producers/:channelId/next", asyncRoute(async (req, res) => {
  await ensureStorage();
  const client = await requireRedis(res);
  if (!client) {
    return;
  }
  const { channelId } = req.params;
  if (!isProducerAuthorized(req, channelId)) {
    return res.status(401).json({ error: "invalid_producer_token" });
  }

  await client.set(`channel:${channelId}:producer-heartbeat`, String(Date.now()), "EX", config.producerHeartbeatTtlSec);

  if (await client.get(muteKey(channelId))) {
    return res.status(204).end();
  }

  const current = await getCurrentTurn(channelId, client);
  if (current) {
    return res.json({ command: current.command });
  }

  const claimed = await client.set(claimKey(channelId), "1", "PX", 15000, "NX");
  if (claimed !== "OK") {
    return res.status(204).end();
  }

  try {
    const raw = await client.lpop(queueKey(channelId));
    if (!raw) {
      return res.status(204).end();
    }

    const job = JSON.parse(raw) as MessageJobData;
    await setMessageState(job.messageId, job.channelId, job.viewerId, job.message, "locked", {
      mode: "vercel-http",
    });

    const text = await ai.generateFromJob(job);
    const command = commandFor(job, text || config.llmFallbackText, "primary");
    const turn: CurrentTurn = {
      job,
      command,
      attempt: "primary",
      expiresAtMs: Date.now() + Math.max(1000, config.speakTimeoutMs),
    };
    await saveCurrentTurn(turn);

    return res.json({ command });
  } finally {
    await client.del(claimKey(channelId));
  }
}));

app.post("/api/producers/:channelId/events", asyncRoute(async (req, res) => {
  await ensureStorage();
  const client = await requireRedis(res);
  if (!client) {
    return;
  }
  const { channelId } = req.params;
  if (!isProducerAuthorized(req, channelId)) {
    return res.status(401).json({ error: "invalid_producer_event_auth" });
  }

  const event = req.body as ProducerStatusEvent;
  if (!event?.messageId || event.channelId !== channelId || !event.type) {
    return res.status(400).json({ error: "invalid_event_payload" });
  }

  const turn = await getCurrentTurn(channelId, client);
  if (!turn || turn.job.messageId !== event.messageId) {
    return res.json({ ok: true, ignored: true });
  }
  if (event.commandId && event.commandId !== turn.command.commandId) {
    return res.json({ ok: true, ignored: true });
  }
  if (event.attempt && event.attempt !== turn.attempt) {
    return res.json({ ok: true, ignored: true });
  }

  if (event.type === "accepted_for_render") {
    await setMessageState(turn.job.messageId, channelId, turn.job.viewerId, turn.job.message, "locked", {
      producerStatus: event.type,
      attempt: turn.attempt,
    });
    return res.json({ ok: true });
  }

  if (event.type === "avatar_started") {
    await setMessageState(turn.job.messageId, channelId, turn.job.viewerId, turn.job.message, "speaking", {
      producerStatus: event.type,
      attempt: turn.attempt,
    });
    return res.json({ ok: true });
  }

  if (event.type === "avatar_finished") {
    await setMessageState(turn.job.messageId, channelId, turn.job.viewerId, turn.job.message, "done", {
      producerStatus: event.type,
      attempt: turn.attempt,
      finalText: turn.command.text,
    });
    await appendTranscript(turn.job, "ai", turn.command.text);
    await setMessageState(turn.job.messageId, channelId, turn.job.viewerId, turn.job.message, "archived", {
      finalStatus: "done",
    });
    await client.del(currentKey(channelId));
    return res.json({ ok: true });
  }

  if (event.type === "avatar_error" && turn.attempt === "primary") {
    const fallback = commandFor(turn.job, config.llmFallbackText, "fallback");
    await saveCurrentTurn({
      job: turn.job,
      command: fallback,
      attempt: "fallback",
      expiresAtMs: Date.now() + Math.max(1000, config.speakTimeoutMs),
    });
    await setMessageState(turn.job.messageId, channelId, turn.job.viewerId, turn.job.message, "locked", {
      producerStatus: event.type,
      fallback: true,
      reason: event.detail || "avatar_error",
    });
    return res.json({ ok: true, fallbackQueued: true });
  }

  await setMessageState(turn.job.messageId, channelId, turn.job.viewerId, turn.job.message, "failed", {
    producerStatus: event.type,
    attempt: turn.attempt,
    reason: event.detail || "avatar_error",
  });
  await setMessageState(turn.job.messageId, channelId, turn.job.viewerId, turn.job.message, "archived", {
    finalStatus: "failed",
    reason: event.detail || "avatar_error",
  });
  await client.del(currentKey(channelId));
  return res.json({ ok: true });
}));

const controlSchema = z.object({
  command: z.enum(["skip", "stop", "mute", "unmute"]),
  reason: z.string().max(240).optional(),
});

app.post("/api/channels/:channelId/control", asyncRoute(async (req, res) => {
  await ensureStorage();
  const client = await requireRedis(res);
  if (!client) {
    return;
  }
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: "invalid_admin_token" });
  }

  const { channelId } = req.params;
  const parse = controlSchema.safeParse(req.body || {});
  if (!parse.success) {
    return res.status(400).json({ error: "invalid_payload", details: parse.error.flatten() });
  }

  const reason = parse.data.reason || `host_${parse.data.command}`;

  if (parse.data.command === "mute") {
    await client.set(muteKey(channelId), reason);
    return res.json({ channelId, muted: true, reason });
  }

  if (parse.data.command === "unmute") {
    await client.del(muteKey(channelId));
    return res.json({ channelId, muted: false });
  }

  if (parse.data.command === "stop") {
    await client.set(muteKey(channelId), reason);
    const skipped = await failCurrentTurn(channelId, reason, client);
    return res.json({ channelId, muted: true, skipped });
  }

  return res.json(await failCurrentTurn(channelId, reason, client));
}));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("api error", String((error as Error)?.message || error));
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: "internal_error" });
});

export default app;
