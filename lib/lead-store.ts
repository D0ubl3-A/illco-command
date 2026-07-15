import { getSql } from "@/lib/db";

export type FunnelLead = {
  name: string;
  email: string;
  company: string;
  planId: string;
  message: string;
  source: string;
  submittedAt: string;
};

export type StoredLead = {
  id: string;
  submittedAt: string;
  createdAt: string;
};

export type StoredLeadReference = {
  id: string;
  email: string;
  planId: string;
};

export async function recordLead(lead: FunnelLead): Promise<StoredLead> {
  const sql = getSql();
  const submittedAt = lead.submittedAt || new Date().toISOString();
  const rawPayload = { ...lead, submittedAt };
  const rows = (await sql`
    INSERT INTO illco_command_leads (
      name,
      email,
      company,
      plan_id,
      message,
      source,
      submitted_at,
      raw_payload
    )
    VALUES (
      ${lead.name},
      ${lead.email},
      ${lead.company || null},
      ${lead.planId || null},
      ${lead.message || null},
      ${lead.source},
      ${submittedAt}::timestamptz,
      ${JSON.stringify(rawPayload)}::jsonb
    )
    RETURNING
      id::text AS id,
      submitted_at::text AS "submittedAt",
      created_at::text AS "createdAt"
  `) as StoredLead[];

  const storedLead = rows[0];
  if (!storedLead?.id) {
    throw new Error("Lead insert did not return a stored record.");
  }

  return storedLead;
}

export async function getLeadReference(leadId: string): Promise<StoredLeadReference | null> {
  const normalizedLeadId = String(leadId || "").trim();
  if (!normalizedLeadId || normalizedLeadId.length > 80) return null;

  const sql = getSql();
  const rows = (await sql`
    SELECT
      id::text AS id,
      email,
      COALESCE(plan_id, '') AS "planId"
    FROM illco_command_leads
    WHERE id::text = ${normalizedLeadId}
    LIMIT 1
  `) as StoredLeadReference[];

  return rows[0] || null;
}
