import "@/lib/server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type Stripe from "stripe";

import { getDatabaseUrl, getSql, hasDatabase, hasDsqlDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { getLeadReference } from "@/lib/lead-store";

export const serviceOrderStatuses = [
  "payment-pending",
  "onboarding",
  "building",
  "qa",
  "delivered",
  "live",
  "blocked",
  "cancelled",
  "refunded",
] as const;
export const serviceOrderProofStatuses = ["pending", "requested", "received", "approved", "published", "declined"] as const;
export const serviceOrderPriorities = ["standard", "high", "urgent"] as const;

export type ServiceOrderStatus = (typeof serviceOrderStatuses)[number];
export type ServiceOrderProofStatus = (typeof serviceOrderProofStatuses)[number];
export type ServiceOrderPriority = (typeof serviceOrderPriorities)[number];

export type ServiceOrderChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type ServiceOrderMetrics = {
  responseTime?: string;
  recoveredLeads?: string;
  appointmentsBooked?: string;
  showRate?: string;
  estimatedRevenue?: string;
  viewsBefore?: string;
  viewsAfter?: string;
  clickThroughRateBefore?: string;
  clickThroughRateAfter?: string;
  averageViewDurationBefore?: string;
  averageViewDurationAfter?: string;
  notes?: string;
};

export type ServiceOrder = {
  id: string;
  stripeSessionId: string;
  intakeId: string | null;
  productId: string;
  offerId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  status: ServiceOrderStatus;
  priority: ServiceOrderPriority;
  ownerEmail: string;
  amountSummary: string;
  amountTotalCents: number;
  recurringAmountCents: number;
  currency: string;
  paymentStatus: string;
  checkoutStatus: string;
  dueAt: string | null;
  deliveredAt: string | null;
  launchedAt: string | null;
  proofStatus: ServiceOrderProofStatus;
  proofRating: number | null;
  proofQuote: string;
  proofAttribution: string;
  proofPermission: boolean;
  proofUrl: string;
  metrics: ServiceOrderMetrics;
  checklist: ServiceOrderChecklistItem[];
  createdAt: string;
  updatedAt: string;
};

type ServiceOrderRow = {
  id: string;
  stripe_session_id: string;
  intake_id: string | null;
  product_id: string;
  offer_id: string;
  product_name: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_company: string | null;
  status: string;
  priority: string;
  owner_email: string | null;
  amount_summary: string | null;
  amount_total_cents: number | string | null;
  recurring_amount_cents: number | string | null;
  currency: string | null;
  payment_status: string | null;
  checkout_status: string | null;
  due_at: string | null;
  delivered_at: string | null;
  launched_at: string | null;
  proof_status: string | null;
  proof_rating: number | string | null;
  proof_quote: string | null;
  proof_attribution: string | null;
  proof_permission: boolean | string | number | null;
  proof_url: string | null;
  metrics: unknown;
  checklist: unknown;
  created_at: string;
  updated_at: string;
};

type ProductConfig = {
  offerId: string;
  productId: string;
  productName: string;
  amountSummary: string;
  recurringAmountCents: number;
  dueAt: string;
  checklist: ServiceOrderChecklistItem[];
};

let serviceOrderSchemaReady: Promise<void> | null = null;

function cleanText(value: unknown, maxLength = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "on"].includes(cleanText(value).toLowerCase());
}

function normalizeStatus(value: unknown): ServiceOrderStatus {
  const normalized = cleanText(value).toLowerCase() as ServiceOrderStatus;
  return serviceOrderStatuses.includes(normalized) ? normalized : "onboarding";
}

function normalizePriority(value: unknown): ServiceOrderPriority {
  const normalized = cleanText(value).toLowerCase() as ServiceOrderPriority;
  return serviceOrderPriorities.includes(normalized) ? normalized : "standard";
}

function normalizeProofStatus(value: unknown): ServiceOrderProofStatus {
  const normalized = cleanText(value).toLowerCase() as ServiceOrderProofStatus;
  return serviceOrderProofStatuses.includes(normalized) ? normalized : "pending";
}

function normalizeMetrics(value: unknown): ServiceOrderMetrics {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const output: ServiceOrderMetrics = {};
  for (const key of [
    "responseTime",
    "recoveredLeads",
    "appointmentsBooked",
    "showRate",
    "estimatedRevenue",
    "viewsBefore",
    "viewsAfter",
    "clickThroughRateBefore",
    "clickThroughRateAfter",
    "averageViewDurationBefore",
    "averageViewDurationAfter",
    "notes",
  ] as const) {
    const normalized = cleanText(input[key], key === "notes" ? 1200 : 120);
    if (normalized) output[key] = normalized;
  }
  return output;
}

function normalizeChecklist(value: unknown, fallback: ServiceOrderChecklistItem[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const label = cleanText(entry.label, 180);
      if (!label) return null;
      return {
        id: cleanText(entry.id, 80) || `step-${index + 1}`,
        label,
        done: normalizeBoolean(entry.done),
      } satisfies ServiceOrderChecklistItem;
    })
    .filter((item): item is ServiceOrderChecklistItem => Boolean(item));
  return items.length ? items.slice(0, 30) : fallback;
}

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function rowToOrder(row: ServiceOrderRow): ServiceOrder {
  return {
    id: row.id,
    stripeSessionId: row.stripe_session_id,
    intakeId: row.intake_id,
    productId: row.product_id,
    offerId: row.offer_id,
    productName: row.product_name,
    customerName: row.customer_name || "",
    customerEmail: row.customer_email || "",
    customerCompany: row.customer_company || "",
    status: normalizeStatus(row.status),
    priority: normalizePriority(row.priority),
    ownerEmail: row.owner_email || "",
    amountSummary: row.amount_summary || "",
    amountTotalCents: toNumber(row.amount_total_cents),
    recurringAmountCents: toNumber(row.recurring_amount_cents),
    currency: row.currency || "usd",
    paymentStatus: row.payment_status || "unknown",
    checkoutStatus: row.checkout_status || "unknown",
    dueAt: row.due_at,
    deliveredAt: row.delivered_at,
    launchedAt: row.launched_at,
    proofStatus: normalizeProofStatus(row.proof_status),
    proofRating: row.proof_rating == null ? null : Math.max(1, Math.min(5, Math.round(toNumber(row.proof_rating)))),
    proofQuote: row.proof_quote || "",
    proofAttribution: row.proof_attribution || "",
    proofPermission: normalizeBoolean(row.proof_permission),
    proofUrl: row.proof_url || "",
    metrics: normalizeMetrics(parseJson(row.metrics, {})),
    checklist: normalizeChecklist(parseJson(row.checklist, []), []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function addBusinessDays(start: Date, days: number) {
  const value = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    value.setUTCDate(value.getUTCDate() + 1);
    const day = value.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return value;
}

function productConfig(session: Stripe.Checkout.Session): ProductConfig {
  const metadata = session.metadata || {};
  const offerId = cleanText(metadata.offerId || metadata.productId || session.client_reference_id, 100);
  const productId = cleanText(metadata.productId || session.client_reference_id || offerId, 100);
  const now = new Date();

  if (offerId === "lead-recovery-system" || productId === "lead-recovery-system") {
    return {
      offerId: "lead-recovery-system",
      productId: "lead-recovery-system",
      productName: "ILLCO Lead Recovery System",
      amountSummary: "$750 setup + $199/month",
      recurringAmountCents: toNumber(metadata.recurringAmountCents || 19_900),
      dueAt: addBusinessDays(now, 7).toISOString(),
      checklist: [
        { id: "intake", label: "Intake linked to payment", done: true },
        { id: "payment", label: "Payment verified", done: session.payment_status === "paid" },
        { id: "kickoff", label: "Kickoff and access checklist sent", done: false },
        { id: "access", label: "Phone, CRM, calendar, and routing access confirmed", done: false },
        { id: "map", label: "Workflow and escalation rules approved", done: false },
        { id: "build", label: "Recovery workflow built and connected", done: false },
        { id: "qa", label: "20 consecutive end-to-end tests passed", done: false },
        { id: "launch", label: "Owner approved production launch", done: false },
        { id: "report", label: "30-day performance report delivered", done: false },
        { id: "proof", label: "Customer proof permission requested", done: false },
      ],
    };
  }

  if (offerId === "youtube-rank-revival-ai-pro" || productId === "youtube-ops-vercel") {
    return {
      offerId: "youtube-rank-revival-ai-pro",
      productId: "youtube-ops-vercel",
      productName: "YouTube Rank Revival AI Pro",
      amountSummary: "$50 one time",
      recurringAmountCents: 0,
      dueAt: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
      checklist: [
        { id: "intake", label: "Selected-video intake linked to payment", done: true },
        { id: "payment", label: "Payment verified", done: session.payment_status === "paid" },
        { id: "analysis", label: "Video, audience, and available analytics reviewed", done: false },
        { id: "titles", label: "Three title options completed", done: false },
        { id: "description", label: "Publish-ready description completed", done: false },
        { id: "thumbnail", label: "Thumbnail improvement brief completed", done: false },
        { id: "hook", label: "Hook and first-30-seconds feedback completed", done: false },
        { id: "delivery", label: "Relaunch package delivered", done: false },
        { id: "revision", label: "Seven-day revision window opened", done: false },
        { id: "proof", label: "Customer proof permission requested", done: false },
      ],
    };
  }

  return {
    offerId: offerId || productId || "unknown-offer",
    productId: productId || offerId || "unknown-product",
    productName: offerId || productId || "ILLCO service order",
    amountSummary: session.amount_total ? `${session.amount_total / 100} ${session.currency || "usd"}` : "Paid service",
    recurringAmountCents: 0,
    dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    checklist: [
      { id: "intake", label: "Intake linked to payment", done: Boolean(metadata.intakeId) },
      { id: "payment", label: "Payment verified", done: session.payment_status === "paid" },
      { id: "delivery", label: "Delivery completed", done: false },
      { id: "proof", label: "Customer proof permission requested", done: false },
    ],
  };
}

function orderIdFromSession(sessionId: string) {
  return `order_${createHash("sha256").update(sessionId).digest("hex").slice(0, 28)}`;
}

export async function ensureServiceOrderSchema() {
  if (!hasDatabase()) throw new Error("A database is required for service-order tracking.");
  if (!serviceOrderSchemaReady) serviceOrderSchemaReady = createServiceOrderSchema();
  try {
    await serviceOrderSchemaReady;
  } catch (error) {
    serviceOrderSchemaReady = null;
    throw error;
  }
}

async function createServiceOrderSchema() {
  const sql = getSql();
  const usingDsql = !getDatabaseUrl() && hasDsqlDatabase();
  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_service_orders (
      id TEXT PRIMARY KEY,
      stripe_session_id TEXT NOT NULL UNIQUE,
      intake_id TEXT,
      product_id TEXT NOT NULL,
      offer_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      customer_name TEXT,
      customer_email TEXT,
      customer_company TEXT,
      status TEXT NOT NULL DEFAULT 'onboarding',
      priority TEXT NOT NULL DEFAULT 'standard',
      owner_email TEXT,
      amount_summary TEXT,
      amount_total_cents INTEGER NOT NULL DEFAULT 0,
      recurring_amount_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'usd',
      payment_status TEXT NOT NULL DEFAULT 'unknown',
      checkout_status TEXT NOT NULL DEFAULT 'unknown',
      due_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      launched_at TIMESTAMPTZ,
      proof_status TEXT NOT NULL DEFAULT 'pending',
      proof_rating INTEGER,
      proof_quote TEXT,
      proof_attribution TEXT,
      proof_permission BOOLEAN NOT NULL DEFAULT FALSE,
      proof_url TEXT,
      metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
      checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
      raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const columns = [
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS intake_id TEXT`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS offer_id TEXT`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS product_name TEXT`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS customer_name TEXT`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS customer_email TEXT`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS customer_company TEXT`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'onboarding'`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'standard'`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS owner_email TEXT`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS amount_summary TEXT`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS amount_total_cents INTEGER NOT NULL DEFAULT 0`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS recurring_amount_cents INTEGER NOT NULL DEFAULT 0`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'usd'`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unknown'`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS checkout_status TEXT NOT NULL DEFAULT 'unknown'`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS launched_at TIMESTAMPTZ`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS proof_status TEXT NOT NULL DEFAULT 'pending'`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS proof_rating INTEGER`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS proof_quote TEXT`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS proof_attribution TEXT`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS proof_permission BOOLEAN NOT NULL DEFAULT FALSE`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS proof_url TEXT`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS metrics JSONB NOT NULL DEFAULT '{}'::jsonb`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]'::jsonb`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    sql`ALTER TABLE illco_command_service_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  ];
  await Promise.all(columns);

  if (usingDsql) {
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_service_orders_status ON illco_command_service_orders (status)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_service_orders_due ON illco_command_service_orders (due_at)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_service_orders_email ON illco_command_service_orders (customer_email)`;
  } else {
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_service_orders_status ON illco_command_service_orders (status, updated_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_service_orders_due ON illco_command_service_orders (due_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_service_orders_email ON illco_command_service_orders (LOWER(customer_email))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_service_orders_product ON illco_command_service_orders (offer_id, created_at DESC)`;
  }
}

export async function upsertServiceOrderFromCheckout(session: Stripe.Checkout.Session) {
  await ensureServiceOrderSchema();
  const sql = getSql();
  const config = productConfig(session);
  const intakeId = cleanText(session.metadata?.intakeId, 100) || null;
  const lead = intakeId ? await getLeadReference(intakeId).catch(() => null) : null;
  const customerEmail = cleanText(session.customer_details?.email || session.customer_email || lead?.email, 180).toLowerCase();
  const customerName = cleanText(session.customer_details?.name || lead?.name, 160);
  const customerCompany = cleanText(lead?.company, 180);
  const orderId = orderIdFromSession(session.id);
  const paymentStatus = cleanText(session.payment_status || "unknown", 40);
  const checkoutStatus = cleanText(session.status || "unknown", 40);
  const initialStatus: ServiceOrderStatus = paymentStatus === "paid" ? "onboarding" : "payment-pending";
  const checklistJson = JSON.stringify(config.checklist);
  const rawPayload = JSON.stringify(session as unknown as Record<string, unknown>);

  const rows = (await sql`
    INSERT INTO illco_command_service_orders (
      id, stripe_session_id, intake_id, product_id, offer_id, product_name,
      customer_name, customer_email, customer_company, status, priority,
      amount_summary, amount_total_cents, recurring_amount_cents, currency,
      payment_status, checkout_status, due_at, checklist, raw_payload,
      created_at, updated_at
    ) VALUES (
      ${orderId}, ${session.id}, ${intakeId}, ${config.productId}, ${config.offerId}, ${config.productName},
      ${customerName || null}, ${customerEmail || null}, ${customerCompany || null}, ${initialStatus}, 'standard',
      ${config.amountSummary}, ${session.amount_total || 0}, ${config.recurringAmountCents}, ${session.currency || "usd"},
      ${paymentStatus}, ${checkoutStatus}, ${config.dueAt}, ${checklistJson}::jsonb, ${rawPayload}::jsonb,
      NOW(), NOW()
    )
    ON CONFLICT (stripe_session_id) DO UPDATE SET
      intake_id = COALESCE(illco_command_service_orders.intake_id, EXCLUDED.intake_id),
      product_id = EXCLUDED.product_id,
      offer_id = EXCLUDED.offer_id,
      product_name = EXCLUDED.product_name,
      customer_name = COALESCE(NULLIF(EXCLUDED.customer_name, ''), illco_command_service_orders.customer_name),
      customer_email = COALESCE(NULLIF(EXCLUDED.customer_email, ''), illco_command_service_orders.customer_email),
      customer_company = COALESCE(NULLIF(EXCLUDED.customer_company, ''), illco_command_service_orders.customer_company),
      status = CASE
        WHEN illco_command_service_orders.status = 'payment-pending' AND EXCLUDED.payment_status = 'paid' THEN 'onboarding'
        ELSE illco_command_service_orders.status
      END,
      amount_summary = EXCLUDED.amount_summary,
      amount_total_cents = EXCLUDED.amount_total_cents,
      recurring_amount_cents = EXCLUDED.recurring_amount_cents,
      currency = EXCLUDED.currency,
      payment_status = EXCLUDED.payment_status,
      checkout_status = EXCLUDED.checkout_status,
      due_at = COALESCE(illco_command_service_orders.due_at, EXCLUDED.due_at),
      checklist = CASE
        WHEN jsonb_array_length(illco_command_service_orders.checklist) = 0 THEN EXCLUDED.checklist
        ELSE illco_command_service_orders.checklist
      END,
      raw_payload = EXCLUDED.raw_payload,
      updated_at = NOW()
    RETURNING *
  `) as ServiceOrderRow[];

  const row = rows[0];
  if (!row) throw new Error("Service order upsert did not return a record.");
  return rowToOrder(row);
}

export async function listServiceOrders(limit = 100) {
  await ensureServiceOrderSchema();
  const sql = getSql();
  const safeLimit = Math.max(1, Math.min(300, Math.round(limit)));
  const rows = (await sql`
    SELECT *
    FROM illco_command_service_orders
    ORDER BY
      CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
      CASE status WHEN 'blocked' THEN 1 WHEN 'onboarding' THEN 2 WHEN 'building' THEN 3 WHEN 'qa' THEN 4 ELSE 5 END,
      due_at ASC NULLS LAST,
      created_at DESC
    LIMIT ${safeLimit}
  `) as ServiceOrderRow[];
  return rows.map(rowToOrder);
}

export async function getServiceOrder(orderId: string) {
  await ensureServiceOrderSchema();
  const sql = getSql();
  const id = cleanText(orderId, 80);
  if (!id) return null;
  const rows = (await sql`SELECT * FROM illco_command_service_orders WHERE id = ${id} LIMIT 1`) as ServiceOrderRow[];
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function getServiceOrderByStripeSession(sessionId: string) {
  await ensureServiceOrderSchema();
  const sql = getSql();
  const id = cleanText(sessionId, 120);
  if (!id) return null;
  const rows = (await sql`SELECT * FROM illco_command_service_orders WHERE stripe_session_id = ${id} LIMIT 1`) as ServiceOrderRow[];
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function updateServiceOrder(
  orderId: string,
  input: {
    status?: ServiceOrderStatus;
    priority?: ServiceOrderPriority;
    ownerEmail?: string;
    dueAt?: string | null;
    proofStatus?: ServiceOrderProofStatus;
    proofUrl?: string;
    metrics?: ServiceOrderMetrics;
    checklist?: ServiceOrderChecklistItem[];
  },
) {
  const existing = await getServiceOrder(orderId);
  if (!existing) throw new Error("Service order not found.");

  const nextStatus = input.status ? normalizeStatus(input.status) : existing.status;
  const nextPriority = input.priority ? normalizePriority(input.priority) : existing.priority;
  const nextOwnerEmail = "ownerEmail" in input ? cleanText(input.ownerEmail, 180).toLowerCase() : existing.ownerEmail;
  const nextDueAt = "dueAt" in input ? (cleanText(input.dueAt, 80) || null) : existing.dueAt;
  const nextProofStatus = input.proofStatus ? normalizeProofStatus(input.proofStatus) : existing.proofStatus;
  const nextProofUrl = "proofUrl" in input ? cleanText(input.proofUrl, 500) : existing.proofUrl;
  const nextMetrics = input.metrics ? normalizeMetrics(input.metrics) : existing.metrics;
  const nextChecklist = input.checklist ? normalizeChecklist(input.checklist, existing.checklist) : existing.checklist;
  const deliveredAt = nextStatus === "delivered" && !existing.deliveredAt ? new Date().toISOString() : existing.deliveredAt;
  const launchedAt = nextStatus === "live" && !existing.launchedAt ? new Date().toISOString() : existing.launchedAt;
  const sql = getSql();

  const rows = (await sql`
    UPDATE illco_command_service_orders
    SET
      status = ${nextStatus},
      priority = ${nextPriority},
      owner_email = ${nextOwnerEmail || null},
      due_at = ${nextDueAt},
      delivered_at = ${deliveredAt},
      launched_at = ${launchedAt},
      proof_status = ${nextProofStatus},
      proof_url = ${nextProofUrl || null},
      metrics = ${JSON.stringify(nextMetrics)}::jsonb,
      checklist = ${JSON.stringify(nextChecklist)}::jsonb,
      updated_at = NOW()
    WHERE id = ${existing.id}
    RETURNING *
  `) as ServiceOrderRow[];
  if (!rows[0]) throw new Error("Service order update did not return a record.");
  return rowToOrder(rows[0]);
}

function accessSignature(orderId: string) {
  const secret = env.serviceOrderAccessSecret;
  if (!secret) return "";
  return createHmac("sha256", secret).update(`v1:${orderId}`).digest("hex");
}

export function buildDeliveryHref(order: Pick<ServiceOrder, "id">) {
  const token = accessSignature(order.id);
  if (!token) return null;
  const url = new URL(`/delivery/${encodeURIComponent(order.id)}`, env.appBaseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function verifyDeliveryToken(orderId: string, token: string) {
  const expected = accessSignature(cleanText(orderId, 80));
  const candidate = cleanText(token, 256);
  if (!expected || !candidate || expected.length !== candidate.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

export async function getPublicServiceOrder(orderId: string, token: string) {
  if (!verifyDeliveryToken(orderId, token)) return null;
  return getServiceOrder(orderId);
}

export async function submitServiceOrderProof(
  orderId: string,
  token: string,
  input: { rating: number; quote: string; attribution: string; permission: boolean; metrics?: ServiceOrderMetrics },
) {
  if (!verifyDeliveryToken(orderId, token)) throw new Error("Invalid delivery access token.");
  const existing = await getServiceOrder(orderId);
  if (!existing) throw new Error("Service order not found.");
  const rating = Math.max(1, Math.min(5, Math.round(Number(input.rating) || 0)));
  const quote = cleanText(input.quote, 1600);
  const attribution = cleanText(input.attribution, 220);
  if (!quote || quote.length < 10) throw new Error("Add a short description of your experience.");
  const proofStatus: ServiceOrderProofStatus = input.permission ? "approved" : "received";
  const mergedMetrics = normalizeMetrics({ ...existing.metrics, ...(input.metrics || {}) });
  const sql = getSql();
  const rows = (await sql`
    UPDATE illco_command_service_orders
    SET
      proof_status = ${proofStatus},
      proof_rating = ${rating},
      proof_quote = ${quote},
      proof_attribution = ${attribution || existing.customerCompany || existing.customerName || "Customer"},
      proof_permission = ${Boolean(input.permission)},
      metrics = ${JSON.stringify(mergedMetrics)}::jsonb,
      updated_at = NOW()
    WHERE id = ${existing.id}
    RETURNING *
  `) as ServiceOrderRow[];
  if (!rows[0]) throw new Error("Proof submission did not return a record.");
  return rowToOrder(rows[0]);
}

export async function notifyServiceOrderCreated(order: ServiceOrder) {
  const webhookUrl = env.fulfillmentNotificationWebhookUrl;
  if (!webhookUrl) return { delivered: false, reason: "not-configured" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.leadWebhookSecret ? { Authorization: `Bearer ${env.leadWebhookSecret}` } : {}),
      },
      body: JSON.stringify({
        event: "illco.fulfillment.order_created",
        adminEmails: env.leadAdminEmails,
        order: {
          id: order.id,
          productName: order.productName,
          offerId: order.offerId,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerCompany: order.customerCompany,
          amountSummary: order.amountSummary,
          paymentStatus: order.paymentStatus,
          dueAt: order.dueAt,
          deliveryUrl: buildDeliveryHref(order),
          adminUrl: new URL("/admin/orders", env.appBaseUrl).toString(),
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Fulfillment notification failed with ${response.status}.`);
    return { delivered: true, reason: "sent" };
  } finally {
    clearTimeout(timeout);
  }
}
