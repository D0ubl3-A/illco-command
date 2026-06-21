import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { MessageJobData } from "../types";
import { Orchestrator } from "./orchestrator";
import { config } from "../config";

interface DeadLetterJobData extends MessageJobData {
  error: string;
  attemptsMade: number;
  failedAt: string;
  failedReason?: string;
}

interface EnqueueResult {
  ok: boolean;
  jobId?: string;
  queuePosition?: number;
  reason?: string;
}

export class QueueManager {
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private queueEvents = new Map<string, QueueEvents>();
  private deadLetterQueues = new Map<string, Queue<DeadLetterJobData, any, string>>();

  constructor(
    private redis: Redis,
    private orchestrator: Orchestrator
  ) {}

  private getQueueName(channelId: string) {
    return `${config.queueNamespacePrefix}:${channelId}:queue`;
  }

  private getDlqQueueName(channelId: string) {
    return `${config.queueNamespacePrefix}:${channelId}:dead-letter`;
  }

  private ensureQueue(channelId: string): Queue<MessageJobData, any, string> {
    if (this.queues.has(channelId)) {
      return this.queues.get(channelId)! as Queue<MessageJobData, any, string>;
    }

    const queue = new Queue<MessageJobData>(this.getQueueName(channelId), {
      connection: this.redis as any,
      defaultJobOptions: {
        attempts: config.queueAttempts,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 120 },
        removeOnFail: { count: 300 },
      },
    }) as unknown as Queue<MessageJobData, any, string>;

    const worker = new Worker<MessageJobData>(
      this.getQueueName(channelId),
      async (job: Job<MessageJobData>) => {
        await this.orchestrator.processJob(job.data);
      },
      {
        connection: this.redis as any,
        concurrency: 1,
      }
    );

    worker.on("failed", async (job, err) => {
      // BullMQ will retry based on backoff. We still expose worker-level telemetry.
      if (!job) {
        return;
      }
      const maxAttempts = job.opts.attempts || config.queueAttempts;
      if ((job.attemptsMade || 0) >= maxAttempts) {
        try {
          await this.moveToDeadLetter(channelId, job, err);
        } catch (deadLetterErr) {
          console.error(`Failed to write dead-letter channel=${channelId} job=${job.id}`, String(deadLetterErr));
        }
      }
      console.error(
        `Queue job failed channel=${channelId} job=${job.id} attempt=${job.attemptsMade}`,
        String(err?.message || err)
      );
    });

    const events = new QueueEvents(this.getQueueName(channelId), { connection: this.redis as any });
    events.on("completed", () => {});
    events.on("failed", () => {});

    this.queues.set(channelId, queue);
    this.workers.set(channelId, worker);
    this.queueEvents.set(channelId, events);
    return queue;
  }

  private ensureDeadLetterQueue(channelId: string): Queue<DeadLetterJobData, any, string> {
    if (this.deadLetterQueues.has(channelId)) {
      return this.deadLetterQueues.get(channelId)!;
    }
    const deadLetterQueue = new Queue<DeadLetterJobData>(this.getDlqQueueName(channelId), {
      connection: this.redis as any,
      defaultJobOptions: {
        removeOnComplete: { count: 120 },
        removeOnFail: { count: 300 },
      },
    }) as unknown as Queue<DeadLetterJobData, any, string>;
    this.deadLetterQueues.set(channelId, deadLetterQueue);
    return deadLetterQueue;
  }

  private async moveToDeadLetter(channelId: string, job: Job<MessageJobData>, reason?: unknown) {
    const deadLetterQueue = this.ensureDeadLetterQueue(channelId);
    const payload: DeadLetterJobData = {
      ...job.data,
      error: String((reason as Error)?.message || reason || job.failedReason || "unknown"),
      attemptsMade: job.attemptsMade || 0,
      failedAt: new Date().toISOString(),
      failedReason: job.failedReason || undefined,
    };
    await deadLetterQueue.add("dead-letter", payload, { jobId: `${job.id}:${Date.now()}` });
  }

  public async enqueue(channelId: string, payload: MessageJobData): Promise<EnqueueResult> {
    const queue = this.ensureQueue(channelId);
    const counts = await queue.getJobCounts("waiting", "active", "delayed");
    const total = Number(counts.waiting || 0) + Number(counts.active || 0) + Number(counts.delayed || 0);
    if (total >= config.queueMaxLen) {
      return { ok: false, reason: "queue_full" };
    }

    const job = await queue.add("message", payload, {
      jobId: payload.messageId,
    });
    return {
      ok: true,
      jobId: String(job.id),
      queuePosition: total + 1,
    };
  }

  public async getChannelStats(channelId: string) {
    const queue = this.ensureQueue(channelId);
    const counts = await queue.getJobCounts("waiting", "active", "delayed", "completed", "failed");
    const deadLetterQueue = this.ensureDeadLetterQueue(channelId);
    const deadCounts = await deadLetterQueue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "completed",
      "failed"
    );
    return {
      waiting: Number(counts.waiting || 0),
      active: Number(counts.active || 0),
      delayed: Number(counts.delayed || 0),
      completed: Number(counts.completed || 0),
      failed: Number(counts.failed || 0),
      dead: Number(deadCounts.waiting || 0) + Number(deadCounts.active || 0) + Number(deadCounts.delayed || 0) + Number(deadCounts.failed || 0),
      deadLetter: {
        waiting: Number(deadCounts.waiting || 0),
        active: Number(deadCounts.active || 0),
        delayed: Number(deadCounts.delayed || 0),
        completed: Number(deadCounts.completed || 0),
        failed: Number(deadCounts.failed || 0),
      },
    };
  }

  public sendSpeak(channelId: string, payload: any) {
    // no-op fallback used by orchestrator in case direct socket access is desired
    // method exists for extension symmetry and testing.
  }
}
