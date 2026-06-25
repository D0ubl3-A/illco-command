import "server-only";

import crypto from "node:crypto";

import { env, requireEnv, type FunnelPlanId } from "@/lib/env";
import type { UserAccount, UserPurchase } from "@/lib/user-accounts";
import { listUserPurchases } from "@/lib/user-accounts";
export { accountBridgeCorsHeaders } from "@/lib/account-bridge-cors";

export const ACCOUNT_BRIDGE_TOKEN_PREFIX = "ILLCOACCOUNT";
export const ACCOUNT_BRIDGE_TTL_SECONDS = 10 * 60;

export type AccountBridgePayload = {
  iss: "illco-command";
  aud: string;
  productId: string;
  user: Pick<UserAccount, "id" | "email" | "name" | "company">;
  access: {
    active: boolean;
    planId: FunnelPlanId | null;
    productId: string | null;
    reason: string;
  };
  exp: number;
};

function base64Url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function signPayload(payload: string) {
  const secret = requireEnv(env.checkoutSessionSecret || env.licenseSigningSecret, "CHECKOUT_SESSION_SECRET");
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function paidStatus(status: string) {
  return ["complete", "paid", "active"].includes(status.toLowerCase());
}

function planRank(planId: string) {
  const ranks: Record<string, number> = {
    core: 1,
    studio: 2,
    suite: 3,
    agency: 4,
    enterprise: 5,
  };
  return ranks[planId] || 0;
}

function getAccountAccess(purchases: UserPurchase[], productId: string) {
  const paid = purchases.find((purchase) => {
    if (!paidStatus(purchase.status)) return false;
    if (purchase.productId === productId) return true;
    return purchase.productId === "illco-command" && planRank(purchase.planId) >= planRank("studio");
  });
  if (paid) {
    return {
      active: true,
      planId: paid.planId as FunnelPlanId,
      productId: paid.productId,
      reason: `Active ${paid.planId} purchase`,
    };
  }

  return {
    active: false,
    planId: null,
    productId: null,
    reason: "No completed Studio-or-higher purchase found",
  };
}

export async function createAccountBridgeGrant(user: UserAccount, options: { productId: string; audience: string }) {
  const purchases = await listUserPurchases(user);
  const payload: AccountBridgePayload = {
    iss: "illco-command",
    aud: options.audience,
    productId: options.productId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
    },
    access: getAccountAccess(purchases, options.productId),
    exp: Math.floor(Date.now() / 1000) + ACCOUNT_BRIDGE_TTL_SECONDS,
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${ACCOUNT_BRIDGE_TOKEN_PREFIX}.${encodedPayload}.${signature}`;
}

export async function appendAccountBridgeGrant(returnTo: string, user: UserAccount, options: { productId: string; audience?: string }) {
  const grant = await createAccountBridgeGrant(user, {
    productId: options.productId,
    audience: options.audience || returnTo,
  });
  const url = new URL(returnTo);
  url.searchParams.set("illco_grant", grant);
  return url.toString();
}

export function verifyAccountBridgeGrant(
  token: string | null | undefined,
  options?: { productId?: string; audience?: string },
) {
  const raw = String(token || "").trim();
  if (!raw.startsWith(`${ACCOUNT_BRIDGE_TOKEN_PREFIX}.`)) {
    throw new Error("A valid ILLCO account grant is required.");
  }

  const [, payload, signature] = raw.split(".");
  if (!payload || !signature) {
    throw new Error("ILLCO account grant is malformed.");
  }

  const expectedSignature = signPayload(payload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new Error("ILLCO account grant signature is invalid.");
  }

  let decoded: AccountBridgePayload;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AccountBridgePayload;
  } catch {
    throw new Error("ILLCO account grant payload is invalid.");
  }

  if (decoded.iss !== "illco-command" || !decoded.aud || !decoded.productId) {
    throw new Error("ILLCO account grant audience is invalid.");
  }
  if (options?.productId && decoded.productId !== options.productId) {
    throw new Error("ILLCO account grant product is invalid.");
  }
  if (options?.audience && decoded.aud !== options.audience) {
    throw new Error("ILLCO account grant audience is invalid.");
  }
  if (decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("ILLCO account grant is expired.");
  }

  return decoded;
}

