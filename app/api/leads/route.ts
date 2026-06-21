import { NextResponse } from "next/server";

import { hasDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { recordLead, type FunnelLead, type StoredLead } from "@/lib/lead-store";

type LeadPayload = {
  name?: string;
  email?: string;
  company?: string;
  planId?: string;
  message?: string;
  website?: string;
};

function clean(value: unknown, maxLength = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function webhookFailureDetail(error: unknown) {
  const message = errorMessage(error, "Lead webhook request failed.");
  if (/^Lead webhook failed with \d+\.$/.test(message)) {
    return message;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return "Lead webhook timed out.";
  }
  return "Lead webhook request failed.";
}

async function deliverWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
  leadWebhookSecret: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(leadWebhookSecret ? { Authorization: `Bearer ${leadWebhookSecret}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Lead webhook failed with ${response.status}.`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const databaseConfigured = hasDatabase();
  const spreadsheetWebhookUrl = env.leadSpreadsheetWebhookUrl.trim();
  const adminNotificationWebhookUrl = env.leadAdminNotificationWebhookUrl.trim();
  const spreadsheetConfigured = Boolean(spreadsheetWebhookUrl);
  const adminNotificationConfigured = Boolean(adminNotificationWebhookUrl);

  if (!spreadsheetConfigured && !adminNotificationConfigured) {
    return NextResponse.json(
      { detail: "Request capture is temporarily unavailable. Configure a spreadsheet webhook or admin notification webhook." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as LeadPayload;
  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  const lead: FunnelLead = {
    name: clean(body.name, 120),
    email: clean(body.email, 180).toLowerCase(),
    company: clean(body.company, 160),
    planId: clean(body.planId, 40),
    message: clean(body.message, 1200),
    source: "illco-command-funnel",
    submittedAt: new Date().toISOString(),
  };

  if (!lead.name || !lead.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return NextResponse.json({ detail: "Name and valid email are required." }, { status: 400 });
  }

  let storedLead: StoredLead | null = null;
  if (databaseConfigured) {
    try {
      storedLead = await recordLead(lead);
    } catch (error) {
      return NextResponse.json(
        { detail: "Request capture is temporarily unavailable. Please try again shortly." },
        { status: 502 },
      );
    }
  }

  const leadBasePayload: Record<string, unknown> = {
    ...lead,
    ...(storedLead ? { leadId: storedLead.id } : {}),
  };

  if (spreadsheetConfigured) {
    const spreadsheetPayload: Record<string, unknown> = {
      ...leadBasePayload,
      adminEmails: env.leadAdminEmails,
      deliveryTarget: "spreadsheet",
    };

    try {
      await deliverWebhook(spreadsheetWebhookUrl, spreadsheetPayload, env.leadWebhookSecret);
    } catch (error) {
      return NextResponse.json(
        {
          detail: storedLead
            ? `Lead stored, but spreadsheet webhook delivery failed. ${webhookFailureDetail(error)}`
            : `Lead spreadsheet webhook delivery failed. ${webhookFailureDetail(error)}`,
          ...(storedLead ? { leadId: storedLead.id } : {}),
        },
        { status: 502 },
      );
    }
  }

  if (adminNotificationConfigured) {
    const adminNotificationPayload: Record<string, unknown> = {
      ...leadBasePayload,
      adminEmails: env.leadAdminEmails,
      deliveryTarget: "admin-notification",
      alert: true,
      fromSpreadsheet: !spreadsheetConfigured,
    };

    try {
      await deliverWebhook(adminNotificationWebhookUrl, adminNotificationPayload, env.leadWebhookSecret);
    } catch (error) {
      return NextResponse.json(
        {
          detail: storedLead
            ? `Lead stored, but admin notification webhook delivery failed. ${webhookFailureDetail(error)}`
            : `Lead admin notification webhook delivery failed. ${webhookFailureDetail(error)}`,
          ...(storedLead ? { leadId: storedLead.id } : {}),
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(storedLead ? { ok: true, leadId: storedLead.id } : { ok: true });
}
