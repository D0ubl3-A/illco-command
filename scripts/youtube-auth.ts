import fs from "node:fs/promises";
import path from "node:path";

type OAuthClientBlock = {
  client_id?: string;
  client_secret?: string;
  token_uri?: string;
};

export type YoutubeClientCredentials = {
  installed?: OAuthClientBlock;
  web?: OAuthClientBlock;
};

export type YoutubeToken = {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
};

type YoutubeApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

type AccessTokenOptions = {
  requiredScopes?: readonly string[];
  usage?: string;
};

export const YOUTUBE_SEARCH_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtubepartner",
  "https://www.googleapis.com/auth/youtube.force-ssl",
] as const;

export const YOUTUBE_UPLOAD_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtubepartner",
  "https://www.googleapis.com/auth/youtube.force-ssl",
] as const;

const defaultCredentialsPath = "C:\\Users\\aaron\\.barz\\secrets\\youtube-client-secret.json";
const defaultTokenPath = "C:\\Users\\aaron\\.barz\\artifacts\\youtube-schedule\\token.json";
const defaultTokenUri = "https://oauth2.googleapis.com/token";
const refreshSkewMs = 60_000;

const credentialsPath = path.resolve(process.env.YOUTUBE_CLIENT_SECRET_PATH || defaultCredentialsPath);
const tokenPath = path.resolve(process.env.YOUTUBE_TOKEN_PATH || defaultTokenPath);

function parseJson<T>(raw: string, label: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is missing.`);
  }
  return value;
}

function getOAuthClient(credentials: YoutubeClientCredentials) {
  const client = credentials.installed || credentials.web;
  if (!client) {
    throw new Error("YouTube OAuth client credentials must contain an installed or web client block.");
  }
  return {
    clientId: requireString(client.client_id, "YouTube OAuth client_id"),
    clientSecret: requireString(client.client_secret, "YouTube OAuth client_secret"),
    tokenUri: client.token_uri || defaultTokenUri,
  };
}

function collectKnownSecrets(credentials: YoutubeClientCredentials, token: YoutubeToken) {
  const client = credentials.installed || credentials.web || {};
  return [client.client_id, client.client_secret, token.access_token, token.refresh_token].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}

function tokenHasAnyScope(scopeValue: string | undefined, requiredScopes: readonly string[]) {
  if (!scopeValue) return true;
  const grantedScopes = new Set(scopeValue.split(/\s+/).filter(Boolean));
  return requiredScopes.some((scope) => grantedScopes.has(scope));
}

function assertScopes(token: YoutubeToken, options: AccessTokenOptions) {
  if (!options.requiredScopes?.length || tokenHasAnyScope(token.scope, options.requiredScopes)) return;
  const usage = options.usage ? ` for ${options.usage}` : "";
  throw new Error(
    `The saved YouTube OAuth token is missing a required scope${usage}. Re-authorize with one of: ${options.requiredScopes.join(", ")}`,
  );
}

export function redactForLog(input: unknown, extraSecrets: readonly string[] = []) {
  const initial =
    typeof input === "string" ? input : input instanceof Error ? input.message : JSON.stringify(input, null, 2);
  let text = initial || "";

  for (const secret of extraSecrets) {
    if (secret.length >= 6) {
      text = text.split(secret).join("[REDACTED]");
    }
  }

  return text
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]")
    .replace(/("(?:access_token|refresh_token|client_secret|client_id)"\s*:\s*")[^"]+(")/gi, "$1[REDACTED]$2")
    .replace(/((?:access_token|refresh_token|client_secret|client_id)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/\bya29\.[A-Za-z0-9._~+/=-]+/g, "[REDACTED]");
}

export function formatSafeError(error: unknown) {
  return redactForLog(error instanceof Error ? error.message : error);
}

export async function readYoutubeSecrets() {
  const credentialsRaw = await fs.readFile(credentialsPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    throw new Error(`Unable to read YouTube OAuth client credentials at ${credentialsPath}: ${error.code || error.message}`);
  });
  const tokenRaw = await fs.readFile(tokenPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    throw new Error(`Unable to read YouTube OAuth token at ${tokenPath}: ${error.code || error.message}`);
  });
  const credentials = parseJson<YoutubeClientCredentials>(credentialsRaw, "YouTube OAuth client credentials");
  const token = parseJson<YoutubeToken>(tokenRaw, "YouTube OAuth token");
  const client = getOAuthClient(credentials);
  requireString(token.refresh_token, "YouTube OAuth refresh_token");
  return { credentials, token, client, knownSecrets: collectKnownSecrets(credentials, token) };
}

export async function writeYoutubeToken(token: YoutubeToken) {
  await fs.mkdir(path.dirname(tokenPath), { recursive: true });
  await fs.writeFile(tokenPath, JSON.stringify(token, null, 2));
}

export async function parseYoutubeJsonResponse<T>(
  response: Response,
  action: string,
  extraSecrets: readonly string[] = [],
) {
  const text = await response.text();
  const payload = text ? parseJson<T & YoutubeApiErrorPayload>(text, `${action} response`) : ({} as T & YoutubeApiErrorPayload);

  if (response.ok) return payload as T;

  const apiError = payload.error;
  const reasons = apiError?.errors?.map((item) => item.reason).filter(Boolean).join(", ");
  const message = apiError?.message || text || response.statusText;
  const reasonText = reasons ? `; reason=${reasons}` : apiError?.status ? `; status=${apiError.status}` : "";
  throw new Error(`${action} failed (${response.status} ${response.statusText}${reasonText}): ${redactForLog(message, extraSecrets)}`);
}

export async function fetchYoutubeJson<T>(
  accessToken: string,
  url: URL | string,
  action: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(url, { ...init, headers });
  return parseYoutubeJsonResponse<T>(response, action, [accessToken]);
}

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}`;
}

export async function getYoutubeAccessToken(options: AccessTokenOptions = {}) {
  const { token, client, knownSecrets } = await readYoutubeSecrets();
  assertScopes(token, options);

  if (token.access_token && token.expiry_date && token.expiry_date > Date.now() + refreshSkewMs) {
    return token.access_token;
  }

  const body = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    refresh_token: requireString(token.refresh_token, "YouTube OAuth refresh_token"),
    grant_type: "refresh_token",
  });

  const response = await fetch(client.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await parseYoutubeJsonResponse<{
    access_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  }>(response, "YouTube token refresh", knownSecrets);

  token.access_token = requireString(payload.access_token, "YouTube token refresh access_token");
  token.expiry_date = Date.now() + Number(payload.expires_in || 3600) * 1000;
  token.scope = payload.scope || token.scope;
  token.token_type = payload.token_type || token.token_type;
  assertScopes(token, options);
  await writeYoutubeToken(token);
  return token.access_token;
}
