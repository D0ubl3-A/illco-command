import { getProofState, getTutorialVideo } from "@/lib/demo-videos";
import { getProductById, products, type ProductCategory, type ProductRecord } from "@/lib/deployments";
import { getConfigurationStatus } from "@/lib/env";
import { getMonetizationPlan, type MonetizationPlanEntry } from "@/lib/monetization";
import { getProductModuleHref, isPublicProductLaunchHref } from "@/lib/product-routes";
import { canDirectCheckoutPublicProduct } from "@/lib/public-checkout";
import { BRAND } from "@/lib/brand";

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
    .replace(/\biLLCo\s*AI\b/gi, BRAND.name)
    .replace(/\biLLCoAI\b/gi, BRAND.name.replace(/\s+/g, ""))
    .replace(/\bILLCO\b/g, BRAND.shortName.toUpperCase())
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
  if (product.id === "think-for-me-mode") return "AI execution copilot for turning messy goals into verified next actions";
  if (/youtube/i.test(product.displayName)) return "Audience growth and publishing workflow";
  if (/video|sora|voice|music|lyric|rap|song|radio|lipsync|mastering|visual/i.test(product.name)) return "AI-assisted media production workflow";
  if (/funnel|store|commerce|payments|shop|tshirt/i.test(product.name)) return "Conversion and revenue workflow";
  if (/real-estate|realtor|airbnb/i.test(product.name)) return "Property and lead operations workflow";
  if (/ops|bot|agent|flow|workspace|workstation|codex|tools|nexus/i.test(product.name)) return "AI operations and execution system";
  if (/api|backend|webhook|gateway/i.test(product.name)) return "Connected backend automation layer";
  return `${categoryLabels[product.category]} workflow built for practical results`;
}

function summaryFor(product: ProductRecord) {
  const name = customerProductName(product);

  if (product.id === "think-for-me-mode") {
    return `${name} gives builders a structured path from unclear goals to concrete actions, tool-assisted execution, and verification so work keeps moving instead of looping.`;
  }

  if (product.category === "media") {
    return `${name} gives creators a focused production path for generating, refining, and delivering media without stitching together a pile of disconnected tools.`;
  }

  if (product.category === "automation" || product.category === "command") {
    return `${name} helps teams reduce repetitive work, standardize handoffs, and keep important tasks moving through a guided AI-assisted workflow.`;
  }

  if (product.category === "commerce") {
    return `${name} is designed to shorten the path from customer interest to measurable action with practical commerce, conversion, and workflow tooling.`;
  }

  if (product.category === "realEstate") {
    return `${name} helps property-focused teams organize lead response, follow-up, and repeatable operating tasks in one clearer workflow.`;
  }

  if (product.category === "backend") {
    return `${name} provides the connective layer for moving data, events, and actions between systems with a more controlled automation path.`;
  }

  return `${name} is a ${BRAND.name} experimental workflow built to solve a specific job with a clear access path, visible proof state, and an actionable next step.`;
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
