export type MessageStatus =
  | "received"
  | "accepted"
  | "queued"
  | "locked"
  | "speaking"
  | "done"
  | "failed"
  | "archived"
  | "rejected";

export interface ViewerMessageInput {
  viewerId: string;
  message: string;
  locale?: string;
  intentHint?: string;
  idempotencyKey?: string;
}

export interface ModerationResult {
  decision: "allow" | "reject" | "cooldown";
  riskScore: number;
  matchedRules: string[];
  reason?: string;
  policyVersion: string;
  cooldownMs?: number;
}

export interface MessageJobData {
  messageId: string;
  channelId: string;
  viewerId: string;
  message: string;
  locale?: string;
  intentHint?: string;
  createdAt: string;
}

export interface ProducerStatusEvent {
  channelId: string;
  messageId: string;
  commandId?: string;
  attempt?: "primary" | "fallback";
  type: "accepted_for_render" | "avatar_started" | "avatar_finished" | "avatar_error";
  detail?: string;
}

export interface ProducerSpeakCommand {
  messageId: string;
  commandId: string;
  channelId: string;
  text: string;
  attempt: "primary" | "fallback";
  voiceProfile: string;
  ttsStyle: "neutral" | "excited" | "calm";
  generatedAt: string;
  ttlMs: number;
  timeoutMs: number;
}
