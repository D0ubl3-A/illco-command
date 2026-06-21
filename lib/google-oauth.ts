import crypto from "node:crypto";

import { env } from "@/lib/env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const GOOGLE_SCOPES = ["openid", "email", "profile"];

export const GOOGLE_OAUTH_STATE_COOKIE = "illco_google_oauth_state";
export const GOOGLE_OAUTH_VERIFIER_COOKIE = "illco_google_oauth_verifier";
export const GOOGLE_OAUTH_RETURN_COOKIE = "illco_google_oauth_return";
export const GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
};

type GoogleIdTokenPayload = {
  iss?: string;
  aud?: string;
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
};

export type GoogleAccountProfile = {
  googleSubject: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
};

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function decodeBase64UrlJson<T>(input: string): T | null {
  try {
    return JSON.parse(Buffer.from(input, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function normalizeBoolean(value: boolean | string | undefined) {
  return value === true || value === "true";
}

function normalizeEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value: string | null | undefined, email: string) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  return cleaned || email.split("@")[0] || "Google user";
}

export function isGoogleOAuthConfigured() {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

export function getGoogleOAuthRedirectUri() {
  const configured = env.googleRedirectUri;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.pathname === "/api/auth/oauth/callback") {
        url.pathname = "/api/account/google/callback";
        return url.toString();
      }
      return url.toString();
    } catch {
      // Fall through to the canonical app-account callback.
    }
  }
  return new URL("/api/account/google/callback", env.appBaseUrl).toString();
}

export function getGoogleOAuthCookiePath() {
  try {
    return new URL(getGoogleOAuthRedirectUri()).pathname || "/";
  } catch {
    return "/";
  }
}

export function createGoogleOAuthState() {
  return base64Url(crypto.randomBytes(32));
}

export function createGooglePkceVerifier() {
  return base64Url(crypto.randomBytes(48));
}

export function createGooglePkceChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function buildGoogleAuthorizationUrl(input: {
  state: string;
  codeChallenge: string;
  loginHint?: string | null;
}) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", env.googleClientId);
  url.searchParams.set("redirect_uri", getGoogleOAuthRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "select_account");
  if (input.loginHint) {
    url.searchParams.set("login_hint", input.loginHint);
  }
  return url;
}

export async function exchangeGoogleAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = input.fetchImpl || fetch;
  const body = new URLSearchParams({
    code: input.code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: getGoogleOAuthRedirectUri(),
    grant_type: "authorization_code",
    code_verifier: input.codeVerifier,
  });

  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Google token exchange failed.");
  }

  return payload;
}

export function verifyGoogleIdTokenPayload(idToken: string | null | undefined) {
  const [, payload, signature, extra] = String(idToken || "").split(".");
  if (!payload || !signature || extra) {
    throw new Error("Google ID token is malformed.");
  }

  const decoded = decodeBase64UrlJson<GoogleIdTokenPayload>(payload);
  if (!decoded) {
    throw new Error("Google ID token payload is invalid.");
  }
  if (!decoded.iss || !GOOGLE_ISSUERS.has(decoded.iss)) {
    throw new Error("Google ID token issuer is invalid.");
  }
  if (decoded.aud !== env.googleClientId) {
    throw new Error("Google ID token audience is invalid.");
  }
  if (!decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Google ID token is expired.");
  }
  if (!decoded.sub) {
    throw new Error("Google account subject is missing.");
  }

  return decoded;
}

export async function fetchGoogleAccountProfile(input: {
  accessToken: string;
  idToken?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<GoogleAccountProfile> {
  const idPayload = verifyGoogleIdTokenPayload(input.idToken);
  const fetchImpl = input.fetchImpl || fetch;
  const response = await fetchImpl(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
    cache: "no-store",
  });
  const userInfo = (await response.json().catch(() => ({}))) as GoogleUserInfoResponse;
  if (!response.ok) {
    throw new Error("Google user profile could not be loaded.");
  }

  const googleSubject = String(userInfo.sub || idPayload.sub || "").trim();
  const email = normalizeEmail(userInfo.email || idPayload.email);
  const emailVerified = normalizeBoolean(userInfo.email_verified ?? idPayload.email_verified);
  if (!googleSubject || googleSubject !== idPayload.sub) {
    throw new Error("Google account subject could not be verified.");
  }
  if (!email || !emailVerified) {
    throw new Error("Google account email must be verified.");
  }

  return {
    googleSubject,
    email,
    emailVerified,
    name: normalizeName(userInfo.name || idPayload.name, email),
    avatarUrl: String(userInfo.picture || idPayload.picture || "").trim() || null,
  };
}
