import "@/lib/server-only";

import { createHash, randomBytes } from "node:crypto";

import { ensureAccountSchema } from "@/lib/account-schema";
import { isTrustedAdminEmail } from "@/lib/admin-identities";
import { env } from "@/lib/env";
import { getSql } from "@/lib/db";
import { findUserById, listUserPurchases, type UserAccount } from "@/lib/user-accounts";

export const CHATGPT_OAUTH_CLIENT_ID = "illco-chatgpt-lyric-video-forge";
// Keep the OAuth resource byte-for-byte identical to the canonical MCP URL.
// `www.illcoai.tech` permanently redirects to the apex domain, and OAuth
// clients key bearer tokens by protected-resource URL. Advertising the www
// URL while serving the MCP endpoint from the apex causes an otherwise
// successful authorization to be followed by another authentication challenge.
export const CHATGPT_OAUTH_RESOURCE = "https://illcoai.tech/api/chatgpt/lyric-video-forge/mcp";
export const CHATGPT_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "lyric_video:plan",
  "lyric_video:transcribe",
  "lyric_video:caption",
  "lyric_video:render",
] as const;

const CODE_TTL_SECONDS = 10 * 60;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;

type OAuthCodeRow = {
  user_id: string;
  client_id: string;
  redirect_uri: string;
  scope: string;
  code_challenge: string;
  code_challenge_method: string;
};

type OAuthTokenRow = {
  user_id: string;
  client_id: string;
  scope: string;
  expires_at: string;
};

export type OAuthUserContext = {
  user: UserAccount;
  scopes: string[];
  purchases: Awaited<ReturnType<typeof listUserPurchases>>;
};

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function base64UrlSha256(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

export function getOAuthIssuer(origin?: string) {
  return (origin || env.appBaseUrl || "https://www.illcoai.tech").replace(/\/+$/, "");
}

export function getOAuthAuthorizeUrl(origin?: string) {
  return `${getOAuthIssuer(origin)}/api/oauth/authorize`;
}

export function getOAuthTokenUrl(origin?: string) {
  return `${getOAuthIssuer(origin)}/api/oauth/token`;
}

export function getOAuthUserinfoUrl(origin?: string) {
  return `${getOAuthIssuer(origin)}/api/oauth/userinfo`;
}

export function getOAuthRegistrationUrl(origin?: string) {
  return `${getOAuthIssuer(origin)}/api/oauth/register`;
}

export function normalizeScopes(value: string | null | undefined) {
  const requested = String(value || "")
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  const allowed = new Set(CHATGPT_OAUTH_SCOPES);
  const scopes = requested.length ? requested.filter((scope) => allowed.has(scope as (typeof CHATGPT_OAUTH_SCOPES)[number])) : [...CHATGPT_OAUTH_SCOPES];
  return Array.from(new Set(scopes.length ? scopes : [...CHATGPT_OAUTH_SCOPES]));
}

export function isAllowedRedirectUri(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "chatgpt.com" && url.pathname.startsWith("/connector/oauth/");
  } catch {
    return false;
  }
}

export function isAllowedClientId(value: string) {
  return value === CHATGPT_OAUTH_CLIENT_ID || value.startsWith("chatgpt-");
}

export async function createOAuthAuthorizationCode(input: {
  userId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}) {
  await ensureAccountSchema();
  const code = randomBytes(32).toString("base64url");
  const sql = getSql();
  await sql`
    INSERT INTO illco_command_oauth_codes (
      code_hash,
      user_id,
      client_id,
      redirect_uri,
      scope,
      code_challenge,
      code_challenge_method,
      expires_at
    )
    VALUES (
      ${tokenHash(code)},
      ${input.userId}::uuid,
      ${input.clientId},
      ${input.redirectUri},
      ${input.scope},
      ${input.codeChallenge},
      ${input.codeChallengeMethod || "S256"},
      ${new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString()}
    )
  `;
  return code;
}

export async function exchangeOAuthAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  await ensureAccountSchema();
  const sql = getSql();
  const rows = (await sql`
    WITH matched AS (
      UPDATE illco_command_oauth_codes
      SET consumed_at = NOW()
      WHERE code_hash = ${tokenHash(input.code)}
        AND client_id = ${input.clientId}
        AND redirect_uri = ${input.redirectUri}
        AND consumed_at IS NULL
        AND expires_at > NOW()
      RETURNING
        user_id::text AS user_id,
        client_id,
        redirect_uri,
        scope,
        code_challenge,
        code_challenge_method
    )
    SELECT * FROM matched LIMIT 1
  `) as OAuthCodeRow[];

  const row = rows[0];
  if (!row) throw new Error("Invalid or expired authorization code.");
  if ((row.code_challenge_method || "S256") !== "S256") throw new Error("Unsupported code challenge method.");
  if (base64UrlSha256(input.codeVerifier) !== row.code_challenge) throw new Error("PKCE verification failed.");

  const accessToken = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString();
  await sql`
    INSERT INTO illco_command_oauth_access_tokens (
      token_hash,
      user_id,
      client_id,
      scope,
      expires_at
    )
    VALUES (
      ${tokenHash(accessToken)},
      ${row.user_id}::uuid,
      ${row.client_id},
      ${row.scope},
      ${expiresAt}
    )
  `;

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scope: row.scope,
  };
}

export function readBearerToken(request: Request | null | undefined) {
  const header = request?.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || "";
}

export async function getOAuthUserContextFromRequest(request: Request | null | undefined): Promise<OAuthUserContext | null> {
  const token = readBearerToken(request);
  if (!token) return null;
  await ensureAccountSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      user_id::text AS user_id,
      client_id,
      scope,
      expires_at::text AS expires_at
    FROM illco_command_oauth_access_tokens
    WHERE token_hash = ${tokenHash(token)}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `) as OAuthTokenRow[];
  const row = rows[0];
  if (!row?.user_id) return null;
  const found = await findUserById(row.user_id);
  if (!found) return null;
  const user: UserAccount = {
    id: found.id,
    email: found.email,
    name: found.name,
    company: found.company,
    avatarUrl: found.avatar_url,
    googleLinked: Boolean(found.google_subject),
    emailVerifiedAt: found.email_verified_at,
    createdAt: found.created_at,
  };
  return {
    user,
    scopes: row.scope.split(/\s+/).filter(Boolean),
    purchases: await listUserPurchases(user),
  };
}

export function hasRequiredScope(context: OAuthUserContext | null, scope: string) {
  return Boolean(context?.scopes.includes(scope));
}

export function isOAuthUserAdmin(context: OAuthUserContext | null) {
  return isTrustedAdminEmail(context?.user.email || null);
}

export function hasLyricVideoPurchase(context: OAuthUserContext | null) {
  if (!context) return false;
  if (isOAuthUserAdmin(context)) return true;
  return context.purchases.some((purchase) =>
    ["lyric-video-forge", "full-hd-lyric-videos"].includes(purchase.productId) ||
    purchase.productName.toLowerCase().includes("lyric video")
  );
}
