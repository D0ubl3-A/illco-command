import type { ProductRecord } from "@/lib/deployments";

export type PublicPlanId = "core" | "studio" | "suite" | "enterprise";

export type PublicPlan = {
  id: PublicPlanId;
  name: string;
  priceLabel: string;
  cadence: string;
  audience: string;
  description: string;
  features: string[];
};

export const publicPlans = [
  {
    id: "core",
    name: "Core",
    priceLabel: "$29",
    cadence: "per month",
    audience: "Creators and solo operators",
    description: "Entry access for focused tools, single workflows, and lightweight production.",
    features: ["1 user", "Core app access", "Standard output limits", "Email support"],
  },
  {
    id: "studio",
    name: "Studio",
    priceLabel: "$99",
    cadence: "per month",
    audience: "Artists, creators, and content teams",
    description: "Production subscription for music, video, voice, creative, and automation products.",
    features: ["5 users", "Studio product access", "Higher monthly usage", "Priority setup support"],
  },
  {
    id: "suite",
    name: "Suite",
    priceLabel: "$299",
    cadence: "per month",
    audience: "Agencies and revenue teams",
    description: "Multi-product access for client work, lead recovery, campaigns, and repeatable operations.",
    features: ["20 users", "Cross-product workflows", "Client-ready delivery paths", "Priority support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom",
    cadence: "annual or usage contract",
    audience: "Teams needing private workflows",
    description: "Governed access for private integrations, custom capacity, and managed rollout support.",
    features: ["Custom users", "Private setup", "Security and workflow review", "SLA options"],
  },
] satisfies PublicPlan[];

export const publicAddOns = [
  { name: "Extra user seat", priceLabel: "$12 / month" },
  { name: "Extra 1,000 AI generations", priceLabel: "$25" },
  { name: "Extra 100 video or creative jobs", priceLabel: "$75" },
  { name: "Managed setup session", priceLabel: "$499 one-time" },
  { name: "Custom brand/workflow system", priceLabel: "$1,500 one-time" },
  { name: "Dedicated production sprint", priceLabel: "Custom" },
] as const;

export function getPublicPlanForProduct(product: Pick<ProductRecord, "subscriptionTier">) {
  const planId: PublicPlanId =
    product.subscriptionTier === "Enterprise"
      ? "enterprise"
      : product.subscriptionTier === "Pro"
        ? "suite"
        : product.subscriptionTier === "Studio"
          ? "studio"
          : "core";

  return publicPlans.find((plan) => plan.id === planId) || publicPlans[0];
}

export function getPublicProductPriceLabel(product: Pick<ProductRecord, "priceCents" | "subscriptionTier" | "licenseMode">) {
  const cents = Number(product.priceCents || 0);
  if (Number.isFinite(cents) && cents > 0) {
    return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  if (product.licenseMode === "usage") return "Usage quote";
  if (product.licenseMode === "internal") return "Private";

  const plan = getPublicPlanForProduct(product);
  return plan.id === "enterprise" ? "Custom" : `${plan.priceLabel}/mo`;
}
