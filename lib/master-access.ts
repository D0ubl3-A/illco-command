import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { getProofState } from "@/lib/demo-videos";
import { getProductById, products } from "@/lib/deployments";
import { env } from "@/lib/env";
import { getMonetizationPlan } from "@/lib/monetization";
import { getProductModuleHref } from "@/lib/product-routes";

export const MASTER_ACCESS_COOKIE = "illco_master_access";
export const MASTER_ACCESS_TTL_SECONDS = 60 * 60 * 8;

const SESSION_VERSION = "v1";

function signPayload(payload: string) {
  return createHmac("sha256", env.masterLicenseKey).update(payload).digest("base64url");
}

function safeStringMatch(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function isMasterAccessConfigured() {
  return Boolean(env.masterLicenseKey);
}

export function createMasterAccessCookie() {
  if (!env.masterLicenseKey) {
    throw new Error("MASTER_LICENSE_KEY is required for master access.");
  }

  const expiresAt = Date.now() + MASTER_ACCESS_TTL_SECONDS * 1000;
  const payload = `${SESSION_VERSION}.${expiresAt}`;
  return {
    value: `${payload}.${signPayload(payload)}`,
    expiresAt,
  };
}

export function isMasterUnlockableProduct(productId: string) {
  const product = getProductById(productId);
  if (!product) return false;

  const monetization = getMonetizationPlan(product.id);
  if (!monetization?.publicInFunnel || monetization.healthGate.behavior !== "allow-checkout") return false;

  return getProofState(product.id).ready;
}

export function getMasterUnlockableProducts() {
  return products
    .filter((product) => isMasterUnlockableProduct(product.id))
    .map((product) => ({
      id: product.id,
      displayName: product.displayName,
      category: product.category,
      href: getProductModuleHref(product.id),
      proofLabel: getProofState(product.id).primaryVideo?.mode === "full-walkthrough" ? "Tutorial ready" : "Proof ready",
    }));
}

export async function readMasterAccessSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(MASTER_ACCESS_COOKIE)?.value;
  const unlocked = Boolean(value && isValidMasterAccessCookie(value));
  const expiresAt = unlocked ? Number(value?.split(".")[1]) : null;

  return {
    available: isMasterAccessConfigured(),
    unlocked,
    expiresAt,
    unlockableProducts: getMasterUnlockableProducts(),
  };
}

export async function isMasterAccessUnlocked() {
  const status = await readMasterAccessSession();
  return status.unlocked;
}

function isValidMasterAccessCookie(value: string) {
  if (!env.masterLicenseKey) return false;

  const [version, expiresAtText, signature, extra] = value.split(".");
  if (extra || version !== SESSION_VERSION || !expiresAtText || !signature) return false;

  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  return safeStringMatch(signature, signPayload(`${version}.${expiresAtText}`));
}
