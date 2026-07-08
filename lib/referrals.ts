import "@/lib/server-only";

import { randomBytes } from "node:crypto";

import type Stripe from "stripe";

import { ensureAccountSchema } from "@/lib/account-schema";
import { getDatabaseUrl, getSql, hasDatabase, hasDsqlDatabase } from "@/lib/db";
import { env, type FunnelPlanId } from "@/lib/env";
import {
  createReferralTransfer,
  retrieveReferralConnectedAccount,
  retrieveStripeSubscription,
} from "@/lib/stripe";
import type { UserAccount } from "@/lib/user-accounts";

export const REFERRAL_COOKIE = "illco_referral";
export const REFERRAL_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 45;

type ReferralProfileRow = {
  user_id: string;
  code: string;
  stripe_account_id: string | null;
  stripe_onboarding_status: string;
  stripe_payouts_enabled: boolean | null;
  created_at: string;
  updated_at: string;
};

type ReferralCommissionRow = {
  id: string;
  source_type: string;
  source_id: string;
  product_id: string;
  plan_id: string;
  gross_amount_cents: number;
  commission_rate_bps: number;
  commission_amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  eligible_at: string;
  paid_at: string | null;
};

type ReferralCashoutRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  stripe_transfer_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type ReferralAttributionInput = {
  stripeSessionId: string;
  referralCode: string;
  buyerUserId?: string | null;
  buyerEmail?: string | null;
  productId: string;
  planId: FunnelPlanId;
};

type ReferralCommissionInput = {
  referrerUserId: string;
  referralCode: string;
  sourceType: "checkout_session" | "invoice";
  sourceId: string;
  stripeCustomerId?: string | null;
  productId: string;
  planId: string;
  grossAmountCents: number;
  currency: string;
};

let referralSchemaReady: Promise<void> | null = null;

export function normalizeReferralCode(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "")
    .slice(0, 48);
}

export function getReferralConfig() {
  return {
    rateBps: Math.max(0, Math.min(8000, Math.round(env.referralCommissionRatePercent * 100))),
    minimumCashoutCents: env.referralCashoutMinimumCents,
    holdDays: env.referralCommissionHoldDays,
    currency: env.referralCurrency.toLowerCase(),
  };
}

export async function ensureReferralSchema() {
  if (!hasDatabase()) {
    throw new Error("A database is required for referrals.");
  }

  if (!referralSchemaReady) {
    referralSchemaReady = createReferralSchema();
  }

  try {
    await referralSchemaReady;
  } catch (error) {
    referralSchemaReady = null;
    throw error;
  }
}

async function createReferralSchema() {
  await ensureAccountSchema();

  const sql = getSql();
  const usingDsql = !getDatabaseUrl() && hasDsqlDatabase();

  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_referral_profiles (
      user_id UUID PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      stripe_account_id TEXT,
      stripe_onboarding_status TEXT NOT NULL DEFAULT 'not_started',
      stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_referral_attributions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referral_code TEXT NOT NULL,
      referrer_user_id UUID NOT NULL,
      buyer_user_id UUID,
      buyer_email TEXT,
      stripe_session_id TEXT NOT NULL UNIQUE,
      product_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'created',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_referral_commissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_user_id UUID NOT NULL,
      referral_code TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL UNIQUE,
      stripe_customer_id TEXT,
      product_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      gross_amount_cents INTEGER NOT NULL,
      commission_rate_bps INTEGER NOT NULL,
      commission_amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      status TEXT NOT NULL DEFAULT 'pending',
      cashout_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      eligible_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS illco_command_referral_cashouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_transfer_id TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  if (usingDsql) {
    await sql`CREATE UNIQUE INDEX ASYNC IF NOT EXISTS idx_illco_referral_profiles_code ON illco_command_referral_profiles (code)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_referral_attr_referrer ON illco_command_referral_attributions (referrer_user_id, created_at)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_referral_commissions_referrer ON illco_command_referral_commissions (referrer_user_id, status, eligible_at)`;
    await sql`CREATE INDEX ASYNC IF NOT EXISTS idx_illco_referral_cashouts_user ON illco_command_referral_cashouts (user_id, created_at)`;
  } else {
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_illco_referral_profiles_code ON illco_command_referral_profiles (code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_referral_attr_referrer ON illco_command_referral_attributions (referrer_user_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_referral_commissions_referrer ON illco_command_referral_commissions (referrer_user_id, status, eligible_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_illco_referral_cashouts_user ON illco_command_referral_cashouts (user_id, created_at DESC)`;
  }
}

function profileFromRow(row: ReferralProfileRow) {
  return {
    userId: row.user_id,
    code: row.code,
    stripeAccountId: row.stripe_account_id,
    stripeOnboardingStatus: row.stripe_onboarding_status,
    stripePayoutsEnabled: Boolean(row.stripe_payouts_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function makeReferralCode(user: UserAccount) {
  const base =
    (user.company || user.name || user.email.split("@")[0] || "illco")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 18) || "illco";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export async function getOrCreateReferralProfile(user: UserAccount) {
  await ensureReferralSchema();

  const sql = getSql();
  const existing = (await sql`
    SELECT
      user_id::text AS user_id,
      code,
      stripe_account_id,
      stripe_onboarding_status,
      stripe_payouts_enabled,
      created_at::text AS created_at,
      updated_at::text AS updated_at
    FROM illco_command_referral_profiles
    WHERE user_id = ${user.id}::uuid
    LIMIT 1
  `) as ReferralProfileRow[];

  if (existing[0]) {
    return profileFromRow(existing[0]);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const code = makeReferralCode(user);
      const rows = (await sql`
        INSERT INTO illco_command_referral_profiles (user_id, code)
        VALUES (${user.id}::uuid, ${code})
        RETURNING
          user_id::text AS user_id,
          code,
          stripe_account_id,
          stripe_onboarding_status,
          stripe_payouts_enabled,
          created_at::text AS created_at,
          updated_at::text AS updated_at
      `) as ReferralProfileRow[];

      if (rows[0]) {
        return profileFromRow(rows[0]);
      }
    } catch {
      // Retry code collisions with a new random suffix.
    }
  }

  throw new Error("Referral profile could not be created.");
}

export async function resolveReferralForCheckout(input: {
  code: string;
  buyerUserId?: string | null;
}) {
  const code = normalizeReferralCode(input.code);
  if (!code || !hasDatabase()) return null;

  await ensureReferralSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      user_id::text AS user_id,
      code,
      stripe_account_id,
      stripe_onboarding_status,
      stripe_payouts_enabled,
      created_at::text AS created_at,
      updated_at::text AS updated_at
    FROM illco_command_referral_profiles
    WHERE code = ${code}
    LIMIT 1
  `) as ReferralProfileRow[];

  const profile = rows[0] ? profileFromRow(rows[0]) : null;
  if (!profile) return null;
  if (input.buyerUserId && profile.userId === input.buyerUserId) return null;
  return profile;
}

export async function recordReferralAttribution(input: ReferralAttributionInput) {
  const code = normalizeReferralCode(input.referralCode);
  if (!code || !hasDatabase()) return null;

  const referral = await resolveReferralForCheckout({
    code,
    buyerUserId: input.buyerUserId || null,
  });
  if (!referral) return null;

  const sql = getSql();
  const rows = (await sql`
    INSERT INTO illco_command_referral_attributions (
      referral_code,
      referrer_user_id,
      buyer_user_id,
      buyer_email,
      stripe_session_id,
      product_id,
      plan_id
    )
    VALUES (
      ${referral.code},
      ${referral.userId}::uuid,
      ${input.buyerUserId || null},
      ${input.buyerEmail || null},
      ${input.stripeSessionId},
      ${input.productId},
      ${input.planId}
    )
    ON CONFLICT (stripe_session_id) DO UPDATE SET
      referral_code = EXCLUDED.referral_code,
      referrer_user_id = EXCLUDED.referrer_user_id,
      buyer_user_id = COALESCE(illco_command_referral_attributions.buyer_user_id, EXCLUDED.buyer_user_id),
      buyer_email = COALESCE(EXCLUDED.buyer_email, illco_command_referral_attributions.buyer_email),
      product_id = EXCLUDED.product_id,
      plan_id = EXCLUDED.plan_id,
      updated_at = NOW()
    RETURNING id::text AS id
  `) as Array<{ id: string }>;

  return rows[0] || null;
}

export async function creditReferralCommission(input: ReferralCommissionInput) {
  if (!hasDatabase()) return { credited: false, reason: "database_unavailable" };
  await ensureReferralSchema();

  const config = getReferralConfig();
  const grossAmountCents = Math.max(0, Math.floor(input.grossAmountCents || 0));
  const commissionAmountCents = Math.floor((grossAmountCents * config.rateBps) / 10_000);
  if (grossAmountCents <= 0 || commissionAmountCents <= 0) {
    return { credited: false, reason: "no_paid_amount" };
  }

  const eligibleAt = new Date(Date.now() + config.holdDays * 24 * 60 * 60 * 1000).toISOString();
  const currency = String(input.currency || config.currency || "usd").toLowerCase();
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO illco_command_referral_commissions (
      referrer_user_id,
      referral_code,
      source_type,
      source_id,
      stripe_customer_id,
      product_id,
      plan_id,
      gross_amount_cents,
      commission_rate_bps,
      commission_amount_cents,
      currency,
      eligible_at
    )
    VALUES (
      ${input.referrerUserId}::uuid,
      ${normalizeReferralCode(input.referralCode)},
      ${input.sourceType},
      ${input.sourceId},
      ${input.stripeCustomerId || null},
      ${input.productId},
      ${input.planId},
      ${grossAmountCents},
      ${config.rateBps},
      ${commissionAmountCents},
      ${currency},
      ${eligibleAt}
    )
    ON CONFLICT (source_id) DO NOTHING
    RETURNING id::text AS id
  `) as Array<{ id: string }>;

  return {
    credited: Boolean(rows[0]?.id),
    commissionId: rows[0]?.id || null,
    commissionAmountCents,
    grossAmountCents,
  };
}

export async function creditReferralCommissionFromCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.mode === "subscription") {
    return { credited: false, reason: "subscription_invoice_handles_commission" };
  }

  const metadata = session.metadata || {};
  return creditReferralCommission({
    referrerUserId: String(metadata.referrerUserId || ""),
    referralCode: String(metadata.referralCode || ""),
    sourceType: "checkout_session",
    sourceId: session.id,
    stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
    productId: String(metadata.productId || session.client_reference_id || "illco-command"),
    planId: String(metadata.planId || "core"),
    grossAmountCents: Number(session.amount_total || 0),
    currency: String(session.currency || env.referralCurrency || "usd"),
  });
}

export async function creditReferralCommissionFromInvoice(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as Stripe.Invoice & {
    amount_paid?: number;
    subscription?: string | { id?: string } | null;
    subscription_details?: { metadata?: Record<string, string> };
    parent?: { subscription_details?: { subscription?: string; metadata?: Record<string, string> } };
  };
  let metadata =
    invoiceAny.subscription_details?.metadata ||
    invoiceAny.parent?.subscription_details?.metadata ||
    invoice.metadata ||
    {};

  const subscriptionId =
    typeof invoiceAny.subscription === "string"
      ? invoiceAny.subscription
      : invoiceAny.subscription?.id || invoiceAny.parent?.subscription_details?.subscription || "";

  if ((!metadata.referrerUserId || !metadata.referralCode) && subscriptionId) {
    try {
      const subscription = await retrieveStripeSubscription(subscriptionId);
      metadata = subscription.metadata || metadata;
    } catch {
      // If the subscription cannot be retrieved, fall back to invoice metadata only.
    }
  }

  if (!metadata.referrerUserId || !metadata.referralCode) {
    return { credited: false, reason: "missing_referral_metadata" };
  }

  return creditReferralCommission({
    referrerUserId: String(metadata.referrerUserId || ""),
    referralCode: String(metadata.referralCode || ""),
    sourceType: "invoice",
    sourceId: invoice.id,
    stripeCustomerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null,
    productId: String(metadata.productId || "illco-command"),
    planId: String(metadata.planId || "core"),
    grossAmountCents: Number(invoiceAny.amount_paid || 0),
    currency: String(invoice.currency || env.referralCurrency || "usd"),
  });
}

export async function updateReferralStripeAccount(input: {
  userId: string;
  stripeAccountId: string;
  onboardingStatus?: string;
  payoutsEnabled?: boolean;
}) {
  await ensureReferralSchema();
  const sql = getSql();
  await sql`
    UPDATE illco_command_referral_profiles
    SET stripe_account_id = ${input.stripeAccountId},
        stripe_onboarding_status = ${input.onboardingStatus || "started"},
        stripe_payouts_enabled = ${Boolean(input.payoutsEnabled)},
        updated_at = NOW()
    WHERE user_id = ${input.userId}::uuid
  `;
}

export async function refreshReferralStripeStatus(user: UserAccount) {
  const profile = await getOrCreateReferralProfile(user);
  if (!profile.stripeAccountId) return profile;

  const account = await retrieveReferralConnectedAccount(profile.stripeAccountId);
  const status = account.details_submitted
    ? account.payouts_enabled
      ? "ready"
      : "submitted"
    : "started";
  await updateReferralStripeAccount({
    userId: user.id,
    stripeAccountId: profile.stripeAccountId,
    onboardingStatus: status,
    payoutsEnabled: Boolean(account.payouts_enabled),
  });

  return {
    ...profile,
    stripeOnboardingStatus: status,
    stripePayoutsEnabled: Boolean(account.payouts_enabled),
  };
}

export async function getReferralOverview(user: UserAccount) {
  await ensureReferralSchema();
  const profile = await getOrCreateReferralProfile(user);
  const sql = getSql();

  const totals = (await sql`
    SELECT
      COALESCE(SUM(commission_amount_cents), 0)::int AS lifetime_cents,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount_cents ELSE 0 END), 0)::int AS pending_cents,
      COALESCE(SUM(CASE WHEN status = 'pending' AND eligible_at <= NOW() THEN commission_amount_cents ELSE 0 END), 0)::int AS available_cents,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount_cents ELSE 0 END), 0)::int AS paid_cents,
      COUNT(*)::int AS commission_count
    FROM illco_command_referral_commissions
    WHERE referrer_user_id = ${user.id}::uuid
  `) as Array<{
    lifetime_cents: number;
    pending_cents: number;
    available_cents: number;
    paid_cents: number;
    commission_count: number;
  }>;

  const commissions = (await sql`
    SELECT
      id::text AS id,
      source_type,
      source_id,
      product_id,
      plan_id,
      gross_amount_cents,
      commission_rate_bps,
      commission_amount_cents,
      currency,
      status,
      created_at::text AS created_at,
      eligible_at::text AS eligible_at,
      paid_at::text AS paid_at
    FROM illco_command_referral_commissions
    WHERE referrer_user_id = ${user.id}::uuid
    ORDER BY created_at DESC
    LIMIT 12
  `) as ReferralCommissionRow[];

  const cashouts = (await sql`
    SELECT
      id::text AS id,
      amount_cents,
      currency,
      status,
      stripe_transfer_id,
      error_message,
      created_at::text AS created_at,
      updated_at::text AS updated_at
    FROM illco_command_referral_cashouts
    WHERE user_id = ${user.id}::uuid
    ORDER BY created_at DESC
    LIMIT 8
  `) as ReferralCashoutRow[];

  const firstTotals = totals[0] || {
    lifetime_cents: 0,
    pending_cents: 0,
    available_cents: 0,
    paid_cents: 0,
    commission_count: 0,
  };

  return {
    profile,
    shareUrl: `${env.appBaseUrl.replace(/\/+$/, "")}/r/${profile.code}`,
    config: getReferralConfig(),
    totals: {
      lifetimeCents: Number(firstTotals.lifetime_cents || 0),
      pendingCents: Number(firstTotals.pending_cents || 0),
      availableCents: Number(firstTotals.available_cents || 0),
      paidCents: Number(firstTotals.paid_cents || 0),
      commissionCount: Number(firstTotals.commission_count || 0),
    },
    commissions: commissions.map((row) => ({
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      productId: row.product_id,
      planId: row.plan_id,
      grossAmountCents: Number(row.gross_amount_cents || 0),
      commissionRateBps: Number(row.commission_rate_bps || 0),
      commissionAmountCents: Number(row.commission_amount_cents || 0),
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
      eligibleAt: row.eligible_at,
      paidAt: row.paid_at,
    })),
    cashouts: cashouts.map((row) => ({
      id: row.id,
      amountCents: Number(row.amount_cents || 0),
      currency: row.currency,
      status: row.status,
      stripeTransferId: row.stripe_transfer_id,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}

export async function processReferralCashout(user: UserAccount) {
  await ensureReferralSchema();
  const overview = await getReferralOverview(user);
  const { profile, config } = overview;

  if (!profile.stripeAccountId) {
    throw new Error("Set up Stripe cashout before requesting a payout.");
  }

  const account = await retrieveReferralConnectedAccount(profile.stripeAccountId);
  if (!account.payouts_enabled) {
    throw new Error("Stripe cashout is not ready yet. Finish Stripe onboarding first.");
  }

  const availableRows = (await getSql()`
    SELECT id::text AS id, commission_amount_cents, currency
    FROM illco_command_referral_commissions
    WHERE referrer_user_id = ${user.id}::uuid
      AND status = 'pending'
      AND eligible_at <= NOW()
    ORDER BY created_at ASC
  `) as Array<{ id: string; commission_amount_cents: number; currency: string }>;

  const currency = config.currency;
  const eligibleRows = availableRows.filter((row) => String(row.currency || currency).toLowerCase() === currency);
  const amountCents = eligibleRows.reduce((sum, row) => sum + Number(row.commission_amount_cents || 0), 0);

  if (amountCents < config.minimumCashoutCents) {
    throw new Error(`Minimum cashout is ${formatMoney(config.minimumCashoutCents, currency)}.`);
  }

  const sql = getSql();
  const cashoutRows = (await sql`
    INSERT INTO illco_command_referral_cashouts (user_id, amount_cents, currency, status)
    VALUES (${user.id}::uuid, ${amountCents}, ${currency}, 'pending')
    RETURNING id::text AS id
  `) as Array<{ id: string }>;
  const cashoutId = cashoutRows[0]?.id;
  if (!cashoutId) {
    throw new Error("Cashout request could not be created.");
  }

  try {
    const transfer = await createReferralTransfer({
      accountId: profile.stripeAccountId,
      amountCents,
      currency,
      metadata: {
        userId: user.id,
        cashoutId,
        type: "illco_referral_cashout",
      },
    });

    await sql`
      UPDATE illco_command_referral_cashouts
      SET status = 'paid',
          stripe_transfer_id = ${transfer.id},
          updated_at = NOW()
      WHERE id = ${cashoutId}::uuid
    `;

    await sql`
      UPDATE illco_command_referral_commissions
      SET status = 'paid',
          cashout_id = ${cashoutId}::uuid,
          paid_at = NOW()
      WHERE referrer_user_id = ${user.id}::uuid
        AND status = 'pending'
        AND eligible_at <= NOW()
        AND currency = ${currency}
    `;

    return {
      cashoutId,
      transferId: transfer.id,
      amountCents,
      currency,
    };
  } catch (error) {
    await sql`
      UPDATE illco_command_referral_cashouts
      SET status = 'failed',
          error_message = ${error instanceof Error ? error.message : "Stripe transfer failed."},
          updated_at = NOW()
      WHERE id = ${cashoutId}::uuid
    `;
    throw error;
  }
}

export function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((Number(cents) || 0) / 100);
}
