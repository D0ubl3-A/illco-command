import { Redis } from "ioredis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export class FixedWindowRateLimiter {
  constructor(private redis: Redis, private windowSec = 60) {}

  async consume(key: string, limit: number, cost = 1): Promise<RateLimitResult> {
    const bucketKey = `rate:${key}`;
    const current = await this.redis.incr(bucketKey);
    if (current === 1) {
      await this.redis.expire(bucketKey, this.windowSec);
    }
    const ttl = await this.redis.ttl(bucketKey);
    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);
    return { allowed, remaining, retryAfterMs: allowed ? 0 : Math.max(0, ttl) * 1000 };
  }
}

export async function consumeIdempotency(redis: Redis, key: string, ttlSec = 3600): Promise<boolean> {
  const result = await redis.set(`idempotency:${key}`, "1", "EX", ttlSec, "NX");
  return result === "OK";
}

export interface IdempotencyReservationResult {
  mode: "accepted" | "duplicate";
  messageId: string;
}

export async function reserveIdempotentMessageId(
  redis: Redis,
  key: string,
  preferredMessageId: string,
  ttlSec = 3600
): Promise<IdempotencyReservationResult> {
  const idempotentKey = `idempotent_id:${key}`;
  const existing = await redis.get(idempotentKey);
  if (existing) {
    return { mode: "duplicate", messageId: existing };
  }
  const set = await redis.set(idempotentKey, preferredMessageId, "EX", ttlSec, "NX");
  if (set === "OK") {
    return { mode: "accepted", messageId: preferredMessageId };
  }
  const latest = await redis.get(idempotentKey);
  return { mode: "duplicate", messageId: latest || preferredMessageId };
}

export async function getStoredIdempotentMessageId(redis: Redis, key: string): Promise<string | null> {
  return redis.get(`idempotent_id:${key}`);
}

export async function setStoredIdempotentMessageId(redis: Redis, key: string, messageId: string, ttlSec = 3600) {
  await redis.set(`idempotent_id:${key}`, messageId, "EX", ttlSec);
}
