import { canOfferPublicCheckout, getMonetizationPlan } from "@/lib/monetization";

function launchBlockedReasonLabel(productId: string) {
  const plan = getMonetizationPlan(productId);
  if (!plan) return "Launch is locked because this product is missing monetization mapping.";
  if (!plan.publicInFunnel) return "Launch is locked because this product is not currently public.";
  if (plan.healthGate.behavior !== "allow-checkout") {
    return "Launch is locked pending manual review for this product.";
  }
  if (plan.healthGate.status !== "healthy") {
    return "Launch is locked because this product is currently degraded or offline.";
  }
  return "Launch is locked pending verification.";
}

export function resolvePurchaseLaunchAccess(productId: string, launchHref: string, options?: { adminOverride?: boolean }) {
  const safeHref = launchHref.trim() || "/";
  if (options?.adminOverride && safeHref !== "/") {
    return {
      launchHref: safeHref,
      launchEnabled: true,
      launchBlockedReason: null,
    };
  }

  const launchEnabled = canOfferPublicCheckout(productId) && Boolean(safeHref);

  return {
    launchHref: safeHref,
    launchEnabled,
    launchBlockedReason: launchEnabled ? null : launchBlockedReasonLabel(productId),
  };
}
