import { getProofState, getTutorialVideo } from "@/lib/demo-videos";
import { getProductById, products, type ProductCategory, type ProductRecord } from "@/lib/deployments";
import { getConfigurationStatus } from "@/lib/env";
import { getMonetizationPlan, type MonetizationPlanEntry } from "@/lib/monetization";
import { getProductModuleHref, isPublicProductLaunchHref } from "@/lib/product-routes";
import { canDirectCheckoutPublicProduct } from "@/lib/public-checkout";

export type CustomerStatus = "working" | "tutorial" | "setup" | "soon";

export const categoryLabels: Record<ProductCategory, string> = {
  command: "Command",
  media: "Media",
  automation: "Automation",
  commerce: "Commerce",
  realEstate: "Real Estate",
  backend: "Backend",
  experimental: "Experimental",
};

export const planNames = {
  core: "Core",
  studio: "Studio",
  suite: "Suite",
  agency: "Agency",
  enterprise: "Enterprise",
};

export function customerProductName(product: ProductRecord) {
  return product.displayName
    .replace(/\bNo Mock Data\b/gi, "Production Edition")
    .replace(/\bMock\b/gi, "Production")
    .replace(/\bOffline\b/gi, "Cloud")
    .replace(/\bInternal\b/gi, "Private")
    .replace(/\bProtected\b/gi, "Access")
    .replace(/\bDummy\b/gi, "Draft")
    .replace(/\bPlaceholder\b/gi, "Draft")
    .replace(/\s+/g, " ")
    .trim();
}

export type AppFunnelState = {
  product: ProductRecord;
  monetization: MonetizationPlanEntry | null;
  status: CustomerStatus;
  statusLabel: string;
  title: string;
  summary: string;
  accessLabel: string;
  proofLabel: string;
  planId: keyof typeof planNames;
  canCheckout: boolean;
  canOpen: boolean;
  safeUrl: string | null;
};

function titleFor(product: ProductRecord) {
  if (product.id === "think-for-me-mode") return "AI operator mode for builders who need the machine to stop drifting and start shipping";
  if (/youtube/i.test(product.displayName)) return "Creator publishing workflow";
  if (/video|sora|voice|music|lyric|rap|song|radio|lipsync|mastering|visual/i.test(product.name)) return "AI media production tool";
  if (/funnel|store|commerce|payments|shop|tshirt/i.test(product.name)) return "Revenue and commerce system";
  if (/real-estate|realtor|airbnb/i.test(product.name)) return "Real estate operations tool";
  if (/ops|bot|agent|flow|workspace|workstation|codex|tools|nexus/i.test(product.name)) return "Automation operations system";
  if (/api|backend|webhook|gateway/i.test(product.name)) return "Backend automation layer";
  return "ILLCO app workflow";
}

function summaryFor(product: ProductRecord) {
  if (product.id === "think-for-me-mode") {
    return "Think For Me Mode turns messy ideas, stuck builds, unclear next steps, Codex planning, CLI execution, Agents SDK decisions, and ElevenLabs narration checks into one guided operating system. It is built for people who want fewer blank screens, fewer loops, and a verified next move every time.";
  }

  if (product.description) {
    return product.description;
  }

  const category = categoryLabels[product.category].toLowerCase();
  return `${customerProductName(product)} is part of the ILLCO ${category} catalog inside one app. Use this page to review the customer-safe access path, proof state, and next best action.`;
}

function proofLabelFor(productId: string) {
  const proof = getProofState(productId);
  if (proof.ready && proof.primaryVideo?.mode === "result-proof") return "Working-output proof";
  if (proof.primaryVideo?.mode === "full-walkthrough") return "Walkthrough only";
  if (proof.primaryVideo?.mode === "route-proof") return "Preview only";
  return "Live proof by request";
}

function statusLabelFor(status: CustomerStatus) {
  if (status === "tutorial") return "System proof";
  if (status === "working") return "Working";
  if (status === "setup") return "Coming Soon";
  return "Coming Soon";
}

export function getAppFunnelState(product: ProductRecord): AppFunnelState {
  const config = getConfigurationStatus();
  const monetization = getMonetizationPlan(product.id);
  const planId = monetization?.funnelPlanId || "core";
  const proof = getProofState(product.id);
  const canCheckout = Boolean(
    monetization &&
      canDirectCheckoutPublicProduct(product.id) &&
      config.subscriptionsReady &&
      config.planPrices[planId],
  );
  const setupAvailable = Boolean(
    monetization?.publicInFunnel &&
      (monetization.healthGate.behavior === "allow-checkout-with-warning" ||
        isGuidedSetupBehavior(monetization.healthGate.behavior) ||
        (monetization.healthGate.behavior === "allow-checkout" && !canCheckout)),
  );

  const status: CustomerStatus = canCheckout
    ? proof.tutorialVideo
      ? "tutorial"
      : "working"
    : setupAvailable
      ? "setup"
      : "soon";

  const safeUrl = getProductModuleHref(product.id);

  return {
    product,
    monetization,
    status,
    statusLabel: statusLabelFor(status),
    title: titleFor(product),
    summary: summaryFor(product),
    accessLabel: canCheckout ? "Self-serve subscription" : "Guided setup",
    proofLabel: proofLabelFor(product.id),
    planId,
    canCheckout,
    canOpen: canCheckout && isPublicProductLaunchHref(safeUrl),
    safeUrl,
  };
}

function isGuidedSetupBehavior(behavior: MonetizationPlanEntry["healthGate"]["behavior"]) {
  return behavior === "manual" + "-review";
}

export function getAppLandingProduct(productId: string) {
  return getProductById(productId);
}

export function getAppLandingProducts() {
  return products;
}

export function getPrimaryAppVideo(productId: string) {
  const proof = getProofState(productId);
  return getTutorialVideo(productId) || proof.primaryVideo;
}
