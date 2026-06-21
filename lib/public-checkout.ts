import { getProofState } from "@/lib/demo-videos";
import { getMonetizationPlan, monetizationPlan } from "@/lib/monetization";
import type { FunnelPlanId } from "@/lib/env";

export function canDirectCheckoutPublicProduct(productId: string) {
  const monetization = getMonetizationPlan(productId);
  if (!monetization?.publicInFunnel) return false;
  if (monetization.healthGate.behavior !== "allow-checkout") return false;
  if (!monetization.needsDemoVideo) return true;
  return getProofState(productId).ready;
}

export function canDirectCheckoutPublicPlan(planId: FunnelPlanId) {
  if (planId === "suite") {
    // Suite is a packaged bundle; use agency-grade public readiness as the baseline checkout gate.
    return canDirectCheckoutPublicPlan("agency");
  }

  return Object.values(monetizationPlan.products).some(
    (product) => product.publicInFunnel && product.funnelPlanId === planId && canDirectCheckoutPublicProduct(product.productId),
  );
}
