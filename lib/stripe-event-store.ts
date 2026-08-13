import type Stripe from "stripe";

import { getSql, hasDatabase } from "@/lib/db";

export type StripeEventClaim =
  | { acquired: true; eventId: string }
  | { acquired: false; eventId: string; status: string };

type EventRow = { event_id: string; status: string };
type OutboxRow = { id: string };

export function getStripeEventObjectId(event: Stripe.Event) {
  const object = event.data.object as { id?: unknown };
  return typeof object?.id === "string" ? object.id : null;
}

export function requireStripeEventStore(available = hasDatabase()) {
  if (!available) {
    throw new Error("Stripe event persistence is temporarily unavailable; retry this webhook.");
  }
}

export async function claimStripeEvent(event: Stripe.Event): Promise<StripeEventClaim> {
  requireStripeEventStore();
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO illco_command_stripe_events (
      event_id, event_type, object_id, api_version, livemode, status,
      attempt_count, payload, received_at, processing_started_at, updated_at
    )
    VALUES (
      ${event.id}, ${event.type}, ${getStripeEventObjectId(event)},
      ${event.api_version || null}, ${event.livemode}, 'processing',
      1, ${JSON.stringify(event)}::jsonb, NOW(), NOW(), NOW()
    )
    ON CONFLICT (event_id) DO UPDATE
      SET status = 'processing',
          attempt_count = illco_command_stripe_events.attempt_count + 1,
          last_error = NULL,
          processing_started_at = NOW(),
          updated_at = NOW()
      WHERE illco_command_stripe_events.status = 'failed'
        AND (
          illco_command_stripe_events.next_attempt_at IS NULL
          OR illco_command_stripe_events.next_attempt_at <= NOW()
        )
    RETURNING event_id, status
  `) as EventRow[];

  if (rows[0]) return { acquired: true, eventId: rows[0].event_id };

  const existing = (await sql`
    SELECT event_id, status
    FROM illco_command_stripe_events
    WHERE event_id = ${event.id}
    LIMIT 1
  `) as EventRow[];

  return {
    acquired: false,
    eventId: event.id,
    status: existing[0]?.status || "processing",
  };
}

export async function completeStripeEvent(eventId: string) {
  const sql = getSql();
  await sql`
    UPDATE illco_command_stripe_events
    SET status = 'completed', processed_at = NOW(), next_attempt_at = NULL,
        last_error = NULL, updated_at = NOW()
    WHERE event_id = ${eventId}
  `;
}

export async function failStripeEvent(eventId: string, error: unknown) {
  const sql = getSql();
  const message = error instanceof Error ? error.message : "Stripe webhook processing failed.";
  await sql`
    UPDATE illco_command_stripe_events
    SET status = 'failed',
        last_error = ${message.slice(0, 4000)},
        next_attempt_at = NOW() + INTERVAL '1 minute',
        updated_at = NOW()
    WHERE event_id = ${eventId}
  `;
}

export async function enqueueStripeNotification(input: {
  eventId: string;
  topic: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
}) {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO illco_command_notification_outbox (
      stripe_event_id, topic, dedupe_key, payload, status, available_at, created_at, updated_at
    )
    VALUES (
      ${input.eventId}, ${input.topic}, ${input.dedupeKey},
      ${JSON.stringify(input.payload)}::jsonb, 'pending', NOW(), NOW(), NOW()
    )
    ON CONFLICT (dedupe_key) DO UPDATE
      SET payload = EXCLUDED.payload, updated_at = NOW()
    RETURNING id
  `) as OutboxRow[];
  return rows[0]?.id || null;
}

export async function markStripeNotificationDelivered(id: string) {
  const sql = getSql();
  await sql`
    UPDATE illco_command_notification_outbox
    SET status = 'delivered', delivered_at = NOW(), last_error = NULL, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function markStripeNotificationFailed(id: string, error: unknown) {
  const sql = getSql();
  const message = error instanceof Error ? error.message : "Notification delivery failed.";
  await sql`
    UPDATE illco_command_notification_outbox
    SET status = 'pending', attempt_count = attempt_count + 1,
        last_error = ${message.slice(0, 4000)},
        available_at = NOW() + INTERVAL '5 minutes', updated_at = NOW()
    WHERE id = ${id}
  `;
}
