import "dotenv/config";

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: num(process.env.PORT, 4000),
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  databaseUrl: process.env.DATABASE_URL || "",
  producerTokenSecret: process.env.PRODUCER_TOKEN_SECRET || "replace-me",
  internalEventSecret: process.env.INTERNAL_EVENT_SECRET || "replace-me",
  controlAdminToken: process.env.CONTROL_ADMIN_TOKEN || "",
  llmEndpoint: process.env.LLM_ENDPOINT || "",
  llmApiKey: process.env.LLM_API_KEY || "",
  llmTimeoutMs: num(process.env.LLM_TIMEOUT_MS, 12000),
  llmFallbackText:
    process.env.LLM_FALLBACK_TEXT || "Let's keep moving and I'll jump right into that next.",
  queueMaxLen: num(process.env.QUEUE_MAX_LEN, 100),
  queueAttempts: num(process.env.QUEUE_ATTEMPTS, 2),
  speakTimeoutMs: num(process.env.SPEAK_TIMEOUT_MS, 30000),
  producerHeartbeatTtlSec: num(process.env.PRODUCER_HEARTBEAT_TTL_SEC, 20),
  cooldownMs: num(process.env.MESSAGE_COOLDOWN_MS, 5000),
  viewerBucketPerMin: num(process.env.VIEWER_BUCKET_PER_MIN, 6),
  channelBucketPerMin: num(process.env.CHANNEL_BUCKET_PER_MIN, 60),
  producerBaseUrl: process.env.PRODUCER_BASE_URL || "http://localhost:4000",
  producerTokenTtlSec: num(process.env.PRODUCER_TOKEN_TTL_SEC, 3600),
  queueNamespacePrefix: "channel",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  producerRoute: "/producer/channel",
};
