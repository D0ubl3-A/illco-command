import "@/lib/server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { isTrustedAdminEmail } from "@/lib/admin-identities";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/user-accounts";

export const ADMIN_SESSION_COOKIE = "illco_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

const SESSION_VERSION = "v1";

export function getAdminKey() {
  const adminKey = env.adminApiKey;
  return adminKey && adminKey.length > 0 ? adminKey : null;
}

export function isSensitiveValueMatch(candidate: string, expected: string) {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();

  return timingSafeEqual(candidateDigest, expectedDigest);
}

export function createAdminSessionCookie(adminKey: string) {
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000;
  const payload = `${SESSION_VERSION}.${expiresAt}`;
  const signature = createSessionSignature(payload, adminKey);

  return `${payload}.${signature}`;
}

export async function isAdminAuthenticated() {
  if (await isTrustedAdminAccountAuthenticated()) {
    return true;
  }

  const adminKey = getAdminKey();

  if (!adminKey) {
    return false;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return isValidAdminSessionCookie(sessionCookie, adminKey);
}

async function isTrustedAdminAccountAuthenticated() {
  try {
    const user = await getCurrentUser();
    return isTrustedAdminEmail(user?.email || null);
  } catch {
    return false;
  }
}

function createSessionSignature(payload: string, adminKey: string) {
  return createHmac("sha256", adminKey).update(payload).digest("hex");
}

function isValidAdminSessionCookie(value: string | undefined, adminKey: string) {
  if (!value) {
    return false;
  }

  const [version, expiresAtText, signature, extra] = value.split(".");

  if (extra || version !== SESSION_VERSION || !expiresAtText || !signature) {
    return false;
  }

  const expiresAt = Number(expiresAtText);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  const expectedSignature = createSessionSignature(`${version}.${expiresAtText}`, adminKey);
  return isSensitiveValueMatch(signature, expectedSignature);
}
