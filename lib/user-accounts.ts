import "@/lib/server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { ensureAccountSchema } from "@/lib/account-schema";
import { isTrustedAdminEmail } from "@/lib/admin-identities";
import { getSql, hasDatabase } from "@/lib/db";
import { getProductById } from "@/lib/deployments";
import { env } from "@/lib/env";
import { resolvePurchaseLaunchAccess } from "@/lib/launch-access";
import { getProductModuleHref } from "@/lib/product-routes";
import { hashAccountPassword, verifyAccountPassword } from "@/lib/user-password";

export const USER_SESSION_COOKIE = "illco_user_session";
export const USER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type UserAccount = {
  id: string;
  email: string;
  name: string;
  company: string | null;
  avatarUrl: string | null;
  googleLinked: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
};

export type UserPurchase = {
  sessionId: string;
  productId: string;
  productName: string;
  planId: string;
  status: string;
  launchHref: string;
  launchEnabled: boolean;
  launchBlockedReason: string | null;
  createdAt: string;
};

export type AccountDatabaseStatus = {
  configured: boolean;
  ready: boolean;
  reason: string | null;
};

export type AccountActionTokenType = "verify_email" | "reset_password";

export type UserAccountSearchResult = UserAccount & {
  purchases: number;
};

export type UserActionTokenIssue = {
  user: UserAccount;
  tokenType: AccountActionTokenType;
  token: string;
  expiresAt: string;
  link: string;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  company: string | null;
  password_hash: string | null;
  google_subject: string | null;
  avatar_url: string | null;
  email_verified_at: string | null;
  created_at: string;
};

let dbStatusCache: { value: AccountDatabaseStatus; checkedAt: number } | null = null;
const DB_STATUS_TTL_MS = 30_000;

export function normalizeAccountEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidAccountEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeAccountEmail(value));
}

export function isAccountsConfigured() {
  return hasDatabase();
}

export async function getAccountDatabaseStatus(options?: { forceRefresh?: boolean }): Promise<AccountDatabaseStatus> {
  const configured = hasDatabase();
  if (!configured) {
    const status: AccountDatabaseStatus = {
      configured: false,
      ready: false,
      reason: "User accounts need the account database before sign-in and saved purchases can be enabled.",
    };
    dbStatusCache = { value: status, checkedAt: Date.now() };
    return status;
  }

  const now = Date.now();
  if (!options?.forceRefresh && dbStatusCache && now - dbStatusCache.checkedAt < DB_STATUS_TTL_MS) {
    return dbStatusCache.value;
  }

  try {
    await ensureUserAccountSchema();
    const status: AccountDatabaseStatus = { configured: true, ready: true, reason: null };
    dbStatusCache = { value: status, checkedAt: now };
    return status;
  } catch (error) {
    const status: AccountDatabaseStatus = {
      configured: true,
      ready: false,
      reason: error instanceof Error ? error.message : "Account database is unavailable.",
    };
    dbStatusCache = { value: status, checkedAt: now };
    return status;
  }
}

function toUserAccount(row: Omit<UserRow, "password_hash">): UserAccount {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    company: row.company,
    avatarUrl: row.avatar_url,
    googleLinked: Boolean(row.google_subject),
    emailVerifiedAt: row.email_verified_at,
    createdAt: row.created_at,
  };
}

function sessionTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function ensureUserAccountSchema() {
  await ensureAccountSchema();
}

export async function findUserByEmail(email: string) {
  await ensureUserAccountSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id::text AS id,
      email,
      name,
      company,
      password_hash,
      google_subject,
      avatar_url,
      email_verified_at::text AS email_verified_at,
      created_at::text AS created_at
    FROM illco_command_users
    WHERE LOWER(email) = LOWER(${normalizeAccountEmail(email)})
    LIMIT 1
  `) as UserRow[];

  return rows[0] || null;
}

export async function createUserAccount(input: {
  email: string;
  name: string;
  company?: string | null;
  password: string;
}) {
  await ensureUserAccountSchema();

  const email = normalizeAccountEmail(input.email);
  const name = input.name.replace(/\s+/g, " ").trim();
  const company = input.company?.replace(/\s+/g, " ").trim() || null;

  if (!name) {
    throw new Error("Name is required.");
  }
  if (!isValidAccountEmail(email)) {
    throw new Error("A valid email is required.");
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("An account already exists for that email.");
  }

  const passwordHash = await hashAccountPassword(input.password);
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO illco_command_users (email, name, company, password_hash)
    VALUES (${email}, ${name}, ${company}, ${passwordHash})
    RETURNING
      id::text AS id,
      email,
      name,
      company,
      google_subject,
      avatar_url,
      email_verified_at::text AS email_verified_at,
      created_at::text AS created_at
  `) as Array<Omit<UserRow, "password_hash">>;

  const user = rows[0];
  if (!user?.id) {
    throw new Error("Account creation failed.");
  }

  await attachCheckoutSessionsToUser(user.id, user.email);
  return toUserAccount(user);
}

export async function findUserByGoogleSubject(googleSubject: string) {
  await ensureUserAccountSchema();
  const normalizedSubject = String(googleSubject || "").trim();
  if (!normalizedSubject) return null;

  const sql = getSql();
  const rows = (await sql`
    SELECT
      id::text AS id,
      email,
      name,
      company,
      password_hash,
      google_subject,
      avatar_url,
      email_verified_at::text AS email_verified_at,
      created_at::text AS created_at
    FROM illco_command_users
    WHERE google_subject = ${normalizedSubject}
    LIMIT 1
  `) as UserRow[];

  return rows[0] || null;
}

export async function upsertGoogleUserAccount(input: {
  googleSubject: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}) {
  await ensureUserAccountSchema();

  const googleSubject = String(input.googleSubject || "").trim();
  const email = normalizeAccountEmail(input.email);
  const name = input.name.replace(/\s+/g, " ").trim() || email.split("@")[0] || "Google user";
  const avatarUrl = String(input.avatarUrl || "").trim() || null;
  if (!googleSubject) {
    throw new Error("Google account subject is required.");
  }
  if (!isValidAccountEmail(email)) {
    throw new Error("A valid Google account email is required.");
  }

  const sql = getSql();
  const googleLinkedUser = await findUserByGoogleSubject(googleSubject);
  if (googleLinkedUser) {
    const rows = (await sql`
      UPDATE illco_command_users
      SET email = ${email},
          name = ${name},
          avatar_url = COALESCE(${avatarUrl}, avatar_url),
          email_verified_at = COALESCE(email_verified_at, NOW()),
          updated_at = NOW()
      WHERE id = ${googleLinkedUser.id}::uuid
      RETURNING
        id::text AS id,
        email,
        name,
        company,
        google_subject,
        avatar_url,
        email_verified_at::text AS email_verified_at,
        created_at::text AS created_at
    `) as Array<Omit<UserRow, "password_hash">>;

    const user = rows[0];
    if (!user?.id) {
      throw new Error("Google account sign-in failed.");
    }
    await attachCheckoutSessionsToUser(user.id, user.email);
    return toUserAccount(user);
  }

  const emailUser = await findUserByEmail(email);
  if (emailUser) {
    if (emailUser.google_subject && emailUser.google_subject !== googleSubject) {
      throw new Error("That email is already linked to a different Google account.");
    }

    const rows = (await sql`
      UPDATE illco_command_users
      SET google_subject = ${googleSubject},
          name = CASE WHEN name = '' THEN ${name} ELSE name END,
          avatar_url = COALESCE(${avatarUrl}, avatar_url),
          email_verified_at = COALESCE(email_verified_at, NOW()),
          updated_at = NOW()
      WHERE id = ${emailUser.id}::uuid
      RETURNING
        id::text AS id,
        email,
        name,
        company,
        google_subject,
        avatar_url,
        email_verified_at::text AS email_verified_at,
        created_at::text AS created_at
    `) as Array<Omit<UserRow, "password_hash">>;

    const user = rows[0];
    if (!user?.id) {
      throw new Error("Google account link failed.");
    }
    await attachCheckoutSessionsToUser(user.id, user.email);
    return toUserAccount(user);
  }

  const rows = (await sql`
    INSERT INTO illco_command_users (email, name, company, password_hash, google_subject, avatar_url, email_verified_at)
    VALUES (${email}, ${name}, null, null, ${googleSubject}, ${avatarUrl}, NOW())
    RETURNING
      id::text AS id,
      email,
      name,
      company,
      google_subject,
      avatar_url,
      email_verified_at::text AS email_verified_at,
      created_at::text AS created_at
  `) as Array<Omit<UserRow, "password_hash">>;

  const user = rows[0];
  if (!user?.id) {
    throw new Error("Google account creation failed.");
  }

  await attachCheckoutSessionsToUser(user.id, user.email);
  return toUserAccount(user);
}

export async function authenticateUserAccount(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    return null;
  }

  const passwordValid = await verifyAccountPassword(password, user.password_hash);
  if (!passwordValid) {
    return null;
  }

  await attachCheckoutSessionsToUser(user.id, user.email);
  return toUserAccount(user);
}

export async function createUserSession(userId: string, userAgent?: string | null) {
  await ensureUserAccountSchema();

  const token = randomBytes(32).toString("base64url");
  const tokenHash = sessionTokenHash(token);
  const expiresAt = new Date(Date.now() + USER_SESSION_TTL_SECONDS * 1000);
  const sql = getSql();

  await sql`
    INSERT INTO illco_command_user_sessions (user_id, session_token_hash, user_agent, expires_at)
    VALUES (${userId}, ${tokenHash}, ${userAgent || null}, ${expiresAt.toISOString()})
  `;

  return token;
}

export async function getCurrentUser() {
  if (!hasDatabase()) {
    return null;
  }

  await ensureUserAccountSchema();

  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT
      u.id::text AS id,
      u.email,
      u.name,
      u.company,
      u.google_subject,
      u.avatar_url,
      u.email_verified_at::text AS email_verified_at,
      u.created_at::text AS created_at
    FROM illco_command_user_sessions s
    JOIN illco_command_users u ON u.id = s.user_id
    WHERE s.session_token_hash = ${sessionTokenHash(token)}
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
    LIMIT 1
  `) as Array<Omit<UserRow, "password_hash">>;

  const user = rows[0];
  if (!user?.id) {
    return null;
  }

  await sql`
    UPDATE illco_command_user_sessions
    SET last_seen_at = NOW()
    WHERE session_token_hash = ${sessionTokenHash(token)}
  `;

  return toUserAccount(user);
}

export async function revokeCurrentUserSession() {
  if (!hasDatabase()) {
    return;
  }

  await ensureUserAccountSchema();

  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (!token) {
    return;
  }

  const sql = getSql();
  await sql`
    UPDATE illco_command_user_sessions
    SET revoked_at = NOW()
    WHERE session_token_hash = ${sessionTokenHash(token)}
  `;
}

export async function attachCheckoutSessionsToUser(userId: string, email: string) {
  await ensureUserAccountSchema();

  const sql = getSql();
  await sql`
    UPDATE illco_command_checkout_sessions
    SET user_id = ${userId}, updated_at = NOW()
    WHERE LOWER(email) = LOWER(${email})
      AND (user_id IS NULL OR user_id = ${userId})
  `;
}

export async function attachCheckoutSessionToUser(sessionId: string, userId: string, email: string | null) {
  await ensureUserAccountSchema();

  const sql = getSql();
  await sql`
    UPDATE illco_command_checkout_sessions
    SET user_id = ${userId},
        email = COALESCE(email, ${email}),
        updated_at = NOW()
    WHERE stripe_session_id = ${sessionId}
  `;
}

export async function listUserPurchases(user: UserAccount): Promise<UserPurchase[]> {
  if (!hasDatabase()) {
    return [];
  }

  await ensureUserAccountSchema();
  await attachCheckoutSessionsToUser(user.id, user.email);
  const adminOverride = isTrustedAdminEmail(user.email);

  const sql = getSql();
  const rows = (await sql`
    SELECT
      stripe_session_id,
      product_id,
      plan_id,
      status,
      created_at::text AS created_at
    FROM illco_command_checkout_sessions
    WHERE user_id = ${user.id}
       OR LOWER(email) = LOWER(${user.email})
    ORDER BY created_at DESC
    LIMIT 20
  `) as Array<{
    stripe_session_id: string;
    product_id: string;
    plan_id: string;
    status: string;
    created_at: string;
  }>;

  return rows.map((row) => {
    const product = getProductById(row.product_id);
    const launch = resolvePurchaseLaunchAccess(row.product_id, product ? getProductModuleHref(product.id) : "/", { adminOverride });

    return {
      sessionId: row.stripe_session_id,
      productId: row.product_id,
      productName: product?.displayName || row.product_id,
      planId: row.plan_id,
      status: row.status,
      launchHref: launch.launchHref,
      launchEnabled: launch.launchEnabled,
      launchBlockedReason: launch.launchBlockedReason,
      createdAt: row.created_at,
    };
  });
}

function normalizeTokenType(value: string) {
  return value === "verify_email" || value === "reset_password" ? value : null;
}

function buildActionLink(tokenType: AccountActionTokenType, token: string) {
  const base = env.appBaseUrl.replace(/\/+$/, "");
  const params =
    tokenType === "verify_email"
      ? `auth=verify-ready&verifyToken=${encodeURIComponent(token)}`
      : `auth=reset-ready&resetToken=${encodeURIComponent(token)}`;
  return `${base}/account?${params}`;
}

export async function findUserById(userId: string) {
  await ensureUserAccountSchema();
  const sql = getSql();
  const normalized = String(userId || "").trim();
  if (!normalized) return null;

  const rows = (await sql`
    SELECT
      id::text AS id,
      email,
      name,
      company,
      password_hash,
      google_subject,
      avatar_url,
      email_verified_at::text AS email_verified_at,
      created_at::text AS created_at
    FROM illco_command_users
    WHERE id = ${normalized}::uuid
    LIMIT 1
  `) as UserRow[];

  return rows[0] || null;
}

export async function setUserPassword(userId: string, password: string) {
  await ensureUserAccountSchema();
  const normalized = String(userId || "").trim();
  if (!normalized) {
    throw new Error("User id is required.");
  }

  const passwordHash = await hashAccountPassword(password);
  const sql = getSql();
  await sql`
    UPDATE illco_command_users
    SET password_hash = ${passwordHash}, updated_at = NOW()
    WHERE id = ${normalized}::uuid
  `;
}

export async function markUserEmailVerified(userId: string) {
  await ensureUserAccountSchema();
  const normalized = String(userId || "").trim();
  if (!normalized) {
    throw new Error("User id is required.");
  }

  const sql = getSql();
  await sql`
    UPDATE illco_command_users
    SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW()
    WHERE id = ${normalized}::uuid
  `;
}

export async function createUserActionToken(input: {
  userId: string;
  tokenType: AccountActionTokenType;
  ttlSeconds?: number;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await ensureUserAccountSchema();

  const normalizedUserId = String(input.userId || "").trim();
  const normalizedTokenType = normalizeTokenType(input.tokenType);
  const ttlSeconds = Number.isFinite(input.ttlSeconds) ? Number(input.ttlSeconds) : 60 * 60;
  const boundedTtl = Math.min(60 * 60 * 24 * 7, Math.max(60, ttlSeconds));
  if (!normalizedUserId) {
    throw new Error("User id is required.");
  }
  if (!normalizedTokenType) {
    throw new Error("Token type is invalid.");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + boundedTtl * 1000).toISOString();
  const sql = getSql();

  await sql`
    INSERT INTO illco_command_user_action_tokens (
      user_id,
      token_type,
      token_hash,
      expires_at,
      created_by,
      metadata
    )
    VALUES (
      ${normalizedUserId}::uuid,
      ${normalizedTokenType},
      ${tokenHash},
      ${expiresAt},
      ${input.createdBy || null},
      ${JSON.stringify(input.metadata || {})}::jsonb
    )
  `;

  return {
    token,
    expiresAt,
    tokenType: normalizedTokenType,
    link: buildActionLink(normalizedTokenType, token),
  };
}

export async function consumeUserActionToken(input: { token: string; tokenType: AccountActionTokenType }) {
  await ensureUserAccountSchema();
  const token = String(input.token || "").trim();
  const tokenType = normalizeTokenType(input.tokenType);
  if (!token || !tokenType) {
    return null;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const sql = getSql();
  const rows = (await sql`
    WITH matched AS (
      UPDATE illco_command_user_action_tokens
      SET consumed_at = NOW()
      WHERE token_hash = ${tokenHash}
        AND token_type = ${tokenType}
        AND consumed_at IS NULL
        AND expires_at > NOW()
      RETURNING user_id::text AS user_id
    )
    SELECT user_id
    FROM matched
    LIMIT 1
  `) as Array<{ user_id: string }>;

  const userId = rows[0]?.user_id || "";
  if (!userId) {
    return null;
  }

  return findUserById(userId);
}

export async function searchUserAccounts(query: string, limit = 20): Promise<UserAccountSearchResult[]> {
  await ensureUserAccountSchema();
  const sql = getSql();
  const normalizedLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const normalizedQuery = String(query || "").trim();
  const wildcard = `%${normalizedQuery}%`;
  const rows = normalizedQuery
    ? ((await sql`
        SELECT
          u.id::text AS id,
          u.email,
          u.name,
          u.company,
          u.google_subject,
          u.avatar_url,
          u.email_verified_at::text AS email_verified_at,
          u.created_at::text AS created_at,
          COUNT(c.id)::int AS purchases
        FROM illco_command_users u
        LEFT JOIN illco_command_checkout_sessions c
          ON c.user_id = u.id OR LOWER(c.email) = LOWER(u.email)
        WHERE u.email ILIKE ${wildcard}
           OR u.name ILIKE ${wildcard}
           OR COALESCE(u.company, '') ILIKE ${wildcard}
        GROUP BY u.id, u.email, u.name, u.company, u.google_subject, u.avatar_url, u.email_verified_at, u.created_at
        ORDER BY u.created_at DESC
        LIMIT ${normalizedLimit}
      `) as Array<Omit<UserRow, "password_hash"> & { purchases: number }>)
    : ((await sql`
        SELECT
          u.id::text AS id,
          u.email,
          u.name,
          u.company,
          u.google_subject,
          u.avatar_url,
          u.email_verified_at::text AS email_verified_at,
          u.created_at::text AS created_at,
          COUNT(c.id)::int AS purchases
        FROM illco_command_users u
        LEFT JOIN illco_command_checkout_sessions c
          ON c.user_id = u.id OR LOWER(c.email) = LOWER(u.email)
        GROUP BY u.id, u.email, u.name, u.company, u.google_subject, u.avatar_url, u.email_verified_at, u.created_at
        ORDER BY u.created_at DESC
        LIMIT ${normalizedLimit}
      `) as Array<Omit<UserRow, "password_hash"> & { purchases: number }>);

  return rows.map((row) => ({
    ...toUserAccount(row),
    purchases: row.purchases,
  }));
}

export async function issueAdminUserActionToken(input: {
  userId: string;
  tokenType: AccountActionTokenType;
  ttlSeconds?: number;
  createdBy?: string | null;
}) {
  const userRow = await findUserById(input.userId);
  if (!userRow) {
    throw new Error("User was not found.");
  }
  const user = toUserAccount(userRow);
  const issued = await createUserActionToken({
    userId: user.id,
    tokenType: input.tokenType,
    ttlSeconds: input.ttlSeconds,
    createdBy: input.createdBy || "admin",
    metadata: { via: "admin" },
  });

  return {
    user,
    tokenType: issued.tokenType,
    token: issued.token,
    expiresAt: issued.expiresAt,
    link: issued.link,
  } as UserActionTokenIssue;
}
