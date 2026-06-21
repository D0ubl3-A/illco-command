import type { FunnelPlanId } from "@/lib/env";
import type { UserPurchase } from "@/lib/user-accounts";

export const CODEX_SDK_MINIMUM_PLAN: FunnelPlanId = "agency";

const planRank: Record<FunnelPlanId, number> = {
  core: 1,
  studio: 2,
  suite: 3,
  agency: 4,
  enterprise: 5,
};

const paidStatuses = new Set(["active", "complete", "paid"]);

export type CodexSdkEntitlement = {
  allowed: boolean;
  requiredPlan: FunnelPlanId;
  bestPlan: FunnelPlanId | null;
  productId: string | null;
  reason: string;
};

function isFunnelPlanId(value: string): value is FunnelPlanId {
  return value === "core" || value === "studio" || value === "suite" || value === "agency" || value === "enterprise";
}

export function getCodexSdkEntitlement(purchases: Pick<UserPurchase, "planId" | "status" | "productId">[]): CodexSdkEntitlement {
  const paid = purchases
    .filter((purchase) => isFunnelPlanId(purchase.planId) && paidStatuses.has(purchase.status.toLowerCase()))
    .sort((a, b) => planRank[b.planId as FunnelPlanId] - planRank[a.planId as FunnelPlanId]);

  const best = paid[0];
  const bestPlan = best?.planId && isFunnelPlanId(best.planId) ? best.planId : null;
  const allowed = Boolean(bestPlan && planRank[bestPlan] >= planRank[CODEX_SDK_MINIMUM_PLAN]);

  return {
    allowed,
    requiredPlan: CODEX_SDK_MINIMUM_PLAN,
    bestPlan,
    productId: best?.productId || null,
    reason: allowed
      ? `Active ${bestPlan} purchase unlocks Codex SDK access.`
      : bestPlan
        ? `Codex SDK access requires ${CODEX_SDK_MINIMUM_PLAN} or enterprise; current best paid plan is ${bestPlan}.`
        : "Codex SDK access requires a completed Agency or Enterprise purchase.",
  };
}
