import { randomUUID } from "crypto";
import { Pool } from "pg";
import { MessageStatus, MessageJobData, ModerationResult } from "./types";

let pool: Pool | null = null;

async function ensureTables(client: Pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS message_audits (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      viewer_id TEXT NOT NULL,
      message_text TEXT NOT NULL,
      status TEXT NOT NULL,
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS moderation_audits (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      viewer_id TEXT NOT NULL,
      message_text TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      matched_rules JSONB,
      decision TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      speaker TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function initStorage(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    return false;
  }
  if (pool) {
    return true;
  }
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("SELECT 1");
  await ensureTables(pool);
  return true;
}

export async function setMessageState(
  messageId: string,
  channelId: string,
  viewerId: string,
  message: string,
  status: MessageStatus,
  extra?: Record<string, any>
) {
  if (!pool) {
    return;
  }
  await pool.query(
    `
    INSERT INTO message_audits (id, channel_id, viewer_id, message_text, status, payload)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO UPDATE
      SET status = EXCLUDED.status,
          payload = COALESCE(message_audits.payload, '{}'::jsonb) || EXCLUDED.payload,
          created_at = NOW()
    `,
    [messageId, channelId, viewerId, message, status, JSON.stringify(extra ?? {})]
  );
}

export async function logModerationDecision(
  messageId: string,
  result: ModerationResult & { channelId: string; viewerId: string; message: string }
) {
  if (!pool) {
    return;
  }
  await pool.query(
    `
    INSERT INTO moderation_audits
      (id, channel_id, viewer_id, message_text, risk_score, matched_rules, decision, policy_version)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT DO NOTHING
    `,
    [
      messageId,
      result.channelId,
      result.viewerId,
      result.message,
      result.riskScore,
      JSON.stringify(result.matchedRules || []),
      result.decision,
      result.policyVersion,
    ]
  );
}

export async function appendTranscript(job: MessageJobData, speaker: "viewer" | "ai", text: string) {
  if (!pool) {
    return;
  }
  await pool.query(
    `INSERT INTO transcripts (id, channel_id, message_id, speaker, text)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), job.channelId, job.messageId, speaker, text]
  );
}
