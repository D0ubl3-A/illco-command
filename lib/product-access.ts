import "@/lib/server-only";

import { isTrustedAdminEmail } from "@/lib/admin-identities";
import { getMonetizationPlan } from "@/lib/monetization";
import { getCurrentUser, listUserPurchases, type UserPurchase } from "@/lib/user-accounts";

const paidStatuses = new Set(["active", "complete", "paid"]);

function isPaidPurchase(purchase: Pick<UserPurchase, "status">) {
  return paidStatuses.has(purchase.status.toLowerCase());
}

function purchaseUnlocksProduct(purchase: Pick<UserPurchase, "productId" | "planId" | "status">, productId: string) {
  if (!isPaidPurchase(purchase)) return false;
  if (purchase.productId === productId) return true;

  const plan = getMonetizationPlan(productId);
  return Boolean(plan && purchase.productId === "illco-command" && purchase.planId === plan.funnelPlanId);
}

export async function getProductAccess(productId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      isAdmin: false,
      purchases: [] as UserPurchase[],
      matchingPurchase: null as UserPurchase | null,
      allowed: false,
      reason: "Sign in with the purchaser account to unlock this product.",
    };
  }

  const isAdmin = isTrustedAdminEmail(user.email);
  const purchases = await listUserPurchases(user);
  const matchingPurchase = purchases.find((purchase) => purchaseUnlocksProduct(purchase, productId)) || null;

  return {
    user,
    isAdmin,
    purchases,
    matchingPurchase,
    allowed: isAdmin || Boolean(matchingPurchase),
    reason: isAdmin
      ? "Admin account unlocks this product."
      : matchingPurchase
        ? "Paid purchase unlocks this product."
        : "This product is locked until a paid subscription is attached to your account.",
  };
}
