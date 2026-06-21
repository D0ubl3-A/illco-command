import { Redis } from "ioredis";
import { MessageJobData, ProducerSpeakCommand, ProducerStatusEvent } from "../types";
import { appendTranscript, setMessageState } from "../db";
import { config } from "../config";
import { AIService } from "./ai";

type TurnResult = "done" | "failed" | "timeout";
type SpeakAttempt = "primary" | "fallback";

interface TurnCompletion {
  resolve: (result: TurnResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ChannelRuntime {
  connected: boolean;
  heartbeatAtMs: number | null;
  status: "idle" | "locked" | "speaking";
  currentJob: MessageJobData | null;
  currentText: string | null;
  currentAttempt: SpeakAttempt | null;
  lastError: string | null;
}

export class Orchestrator {
  private runtimes = new Map<string, ChannelRuntime>();
  private turnCompletions = new Map<string, TurnCompletion>();

  constructor(
    private redis: Redis,
    private ai: AIService,
    private emitSpeak: (channelId: string, payload: ProducerSpeakCommand) => void
  ) {}

  private runtime(channelId: string): ChannelRuntime {
    const existing = this.runtimes.get(channelId);
    if (existing) {
      return existing;
    }

    const runtime: ChannelRuntime = {
      connected: false,
      heartbeatAtMs: null,
      status: "idle",
      currentJob: null,
      currentText: null,
      currentAttempt: null,
      lastError: null,
    };
    this.runtimes.set(channelId, runtime);
    return runtime;
  }

  private lockKey(channelId: string) {
    return `channel:${channelId}:speaker-lock`;
  }

  private muteKey(channelId: string) {
    return `channel:${channelId}:muted`;
  }

  private async muteReason(channelId: string) {
    return this.redis.get(this.muteKey(channelId));
  }

  private async acquireChannelLock(channelId: string, messageId: string) {
    const ttlMs = Math.max(1000, config.speakTimeoutMs * 2);
    const result = await this.redis.set(this.lockKey(channelId), messageId, "PX", ttlMs, "NX");
    return result === "OK";
  }

  private async releaseChannelLock(channelId: string, messageId: string) {
    const key = this.lockKey(channelId);
    const value = await this.redis.get(key);
    if (value === messageId) {
      await this.redis.del(key);
    }
  }

  private commandFor(job: MessageJobData, text: string, attempt: SpeakAttempt): ProducerSpeakCommand {
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

  private waitForFinalAck(messageId: string): Promise<TurnResult> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.resolveTurn(messageId, "timeout");
      }, config.speakTimeoutMs);

      this.turnCompletions.set(messageId, { resolve, timer });
    });
  }

  private resolveTurn(messageId: string, result: TurnResult) {
    const completion = this.turnCompletions.get(messageId);
    if (!completion) {
      return;
    }

    clearTimeout(completion.timer);
    this.turnCompletions.delete(messageId);
    completion.resolve(result);
  }

  private async speakAndWait(job: MessageJobData, text: string, attempt: SpeakAttempt) {
    const runtime = this.runtime(job.channelId);
    runtime.status = "locked";
    runtime.currentText = text;
    runtime.currentAttempt = attempt;
    runtime.lastError = null;

    await setMessageState(job.messageId, job.channelId, job.viewerId, job.message, "locked", {
      attempt,
    });

    this.emitSpeak(job.channelId, this.commandFor(job, text, attempt));
    return this.waitForFinalAck(job.messageId);
  }

  async processJob(job: MessageJobData) {
    const runtime = this.runtime(job.channelId);
    const muteReason = await this.muteReason(job.channelId);
    if (muteReason) {
      await setMessageState(job.messageId, job.channelId, job.viewerId, job.message, "failed", {
        reason: muteReason,
      });
      await setMessageState(job.messageId, job.channelId, job.viewerId, job.message, "archived", {
        finalStatus: "failed",
        reason: muteReason,
      });
      return;
    }

    const locked = await this.acquireChannelLock(job.channelId, job.messageId);

    if (!locked) {
      await setMessageState(job.messageId, job.channelId, job.viewerId, job.message, "queued", {
        reason: "speaker_lock_conflict",
      });
      throw new Error("speaker_lock_conflict");
    }

    runtime.currentJob = job;
    runtime.currentText = null;
    runtime.currentAttempt = null;
    runtime.status = "locked";
    runtime.lastError = null;

    let finalStatus: "done" | "failed" = "failed";
    let finalText = "";
    let finalReason = "";

    try {
      const generated = await this.ai.generateFromJob(job);
      finalText = generated || config.llmFallbackText;

      const primaryResult = await this.speakAndWait(job, finalText, "primary");
      if (primaryResult === "done") {
        finalStatus = "done";
      } else {
        finalReason = runtime.lastError || primaryResult;
        if (runtime.connected && runtime.lastError !== "producer_disconnected") {
          finalText = config.llmFallbackText;
          const fallbackResult = await this.speakAndWait(job, finalText, "fallback");
          finalStatus = fallbackResult === "done" ? "done" : "failed";
          if (fallbackResult !== "done") {
            finalReason = runtime.lastError || fallbackResult;
          }
        }
      }
    } catch (error) {
      finalReason = String((error as Error)?.message || error || "unknown_error");
      if (runtime.connected && runtime.lastError !== "producer_disconnected") {
        finalText = config.llmFallbackText;
        try {
          const fallbackResult = await this.speakAndWait(job, finalText, "fallback");
          finalStatus = fallbackResult === "done" ? "done" : "failed";
          if (fallbackResult !== "done") {
            finalReason = runtime.lastError || fallbackResult;
          }
        } catch (fallbackError) {
          finalStatus = "failed";
          finalReason = String((fallbackError as Error)?.message || fallbackError || finalReason);
        }
      }
    } finally {
      try {
        if (finalStatus === "done") {
          await setMessageState(job.messageId, job.channelId, job.viewerId, job.message, "done", {
            finalText,
          });
          await appendTranscript(job, "ai", finalText);
        } else {
          await setMessageState(job.messageId, job.channelId, job.viewerId, job.message, "failed", {
            reason: finalReason || runtime.lastError || "speak_failed",
          });
        }

        await setMessageState(job.messageId, job.channelId, job.viewerId, job.message, "archived", {
          finalStatus,
          reason: finalReason || undefined,
        });
      } catch (error) {
        console.error("orchestrator final persistence error", String((error as Error)?.message || error));
      }
      runtime.currentJob = null;
      runtime.currentText = null;
      runtime.currentAttempt = null;
      runtime.status = "idle";
      await this.releaseChannelLock(job.channelId, job.messageId);
      this.resolveTurn(job.messageId, finalStatus === "done" ? "done" : "failed");
    }
  }

  async handleProducerStatus(event: ProducerStatusEvent) {
    const runtime = this.runtime(event.channelId);
    if (runtime.currentJob?.messageId !== event.messageId) {
      return;
    }
    if (runtime.currentAttempt && event.attempt && event.attempt !== runtime.currentAttempt) {
      return;
    }
    if (
      runtime.currentAttempt &&
      event.commandId &&
      event.commandId !== `${event.messageId}:${runtime.currentAttempt}`
    ) {
      return;
    }

    if (event.type === "accepted_for_render") {
      runtime.status = "locked";
      await setMessageState(
        event.messageId,
        event.channelId,
        runtime.currentJob.viewerId,
        runtime.currentJob.message,
        "locked",
        { producerStatus: event.type, detail: event.detail, attempt: runtime.currentAttempt }
      );
      return;
    }

    if (event.type === "avatar_started") {
      runtime.status = "speaking";
      await setMessageState(
        event.messageId,
        event.channelId,
        runtime.currentJob.viewerId,
        runtime.currentJob.message,
        "speaking",
        { producerStatus: event.type, detail: event.detail, attempt: runtime.currentAttempt }
      );
      return;
    }

    if (event.type === "avatar_finished") {
      runtime.status = "idle";
      this.resolveTurn(event.messageId, "done");
      return;
    }

    if (event.type === "avatar_error") {
      runtime.status = "idle";
      runtime.lastError = event.detail || "avatar_error";
      this.resolveTurn(event.messageId, "failed");
    }
  }

  async setProducerConnected(channelId: string, connected: boolean) {
    const runtime = this.runtime(channelId);
    runtime.connected = connected;
    runtime.heartbeatAtMs = Date.now();

    if (!connected && runtime.currentJob) {
      runtime.lastError = "producer_disconnected";
      this.resolveTurn(runtime.currentJob.messageId, "failed");
      await setMessageState(
        runtime.currentJob.messageId,
        channelId,
        runtime.currentJob.viewerId,
        runtime.currentJob.message,
        "failed",
        { producerStatus: "producer_disconnected" }
      );
    }
  }

  async setProducerHeartbeat(channelId: string) {
    const runtime = this.runtime(channelId);
    runtime.heartbeatAtMs = Date.now();
  }

  async setChannelMuted(channelId: string, muted: boolean, reason = "host_muted") {
    if (muted) {
      await this.redis.set(this.muteKey(channelId), reason);
    } else {
      await this.redis.del(this.muteKey(channelId));
    }
    return { channelId, muted, reason: muted ? reason : "" };
  }

  async skipCurrent(channelId: string, reason = "host_skip") {
    const runtime = this.runtime(channelId);
    if (!runtime.currentJob) {
      return { channelId, skipped: false, messageId: null };
    }

    runtime.lastError = reason;
    runtime.status = "idle";
    this.resolveTurn(runtime.currentJob.messageId, "failed");
    await setMessageState(
      runtime.currentJob.messageId,
      channelId,
      runtime.currentJob.viewerId,
      runtime.currentJob.message,
      "failed",
      { reason }
    );
    return { channelId, skipped: true, messageId: runtime.currentJob.messageId };
  }

  async getChannelState(channelId: string) {
    const runtime = this.runtime(channelId);
    const heartbeatAgeMs =
      runtime.heartbeatAtMs == null ? null : Math.max(0, Date.now() - runtime.heartbeatAtMs);
    const muteReason = await this.muteReason(channelId);

    return {
      channelId,
      muted: Boolean(muteReason),
      muteReason,
      connected: runtime.connected,
      heartbeatAgeMs,
      stale:
        heartbeatAgeMs != null && heartbeatAgeMs > config.producerHeartbeatTtlSec * 1000,
      status: runtime.status,
      currentMessageId: runtime.currentJob?.messageId || null,
      currentAttempt: runtime.currentAttempt,
      currentText: runtime.currentText,
      lastError: runtime.lastError,
    };
  }
}
