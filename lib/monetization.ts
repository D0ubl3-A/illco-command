import monetizationPlanSnapshot from "@/data/monetization-plan.json";
import { products, type ProductRecord } from "@/lib/deployments";
import type { FunnelPlanId } from "@/lib/env";

export type MonetizationPlanTier = ProductRecord["subscriptionTier"];
export type MonetizationLicenseMode = ProductRecord["licenseMode"];
export type MonetizationHealthStatus = "healthy" | "degraded" | "offline" | "unknown";
export type MonetizationHealthGateBehavior =
  | "allow-checkout"
  | "allow-checkout-with-warning"
  | "block-checkout"
  | "manual-review";

export type MonetizationPlanEntry = {
  productId: string;
  planTier: MonetizationPlanTier;
  funnelPlanId: FunnelPlanId;
  licenseMode: MonetizationLicenseMode;
  routeAfterPurchase: {
    type: "production-url" | "command-center";
    href: string;
  };
  needsDemoVideo: boolean;
  publicInFunnel: boolean;
  healthGate: {
    status: MonetizationHealthStatus;
    behavior: MonetizationHealthGateBehavior;
    reason: string;
  };
};

export type MonetizationPlanSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  sources: {
    deploymentSnapshotTakenAt: string;
    healthSnapshotGeneratedAt: string | null;
    demoVideoSnapshotGeneratedAt: string | null;
  };
  summary: {
    totalProducts: number;
    publicInFunnel: number;
    needsDemoVideo: number;
    healthGateBehavior: Partial<Record<MonetizationHealthGateBehavior, number>>;
  };
  products: Record<string, MonetizationPlanEntry>;
};

export const monetizationPlan = monetizationPlanSnapshot as MonetizationPlanSnapshot;

function collectCoverageProblems(snapshot: MonetizationPlanSnapshot) {
  const snapshotIds = new Set(Object.keys(snapshot.products));
  const productIds = new Set(products.map((product) => product.id));
  const missingProductIds = products
    .filter((product) => !snapshotIds.has(product.id) && product.registrySource !== "illco-command-registry")
    .map((product) => product.id);
  const orphanProductIds = [...snapshotIds].filter((productId) => !productIds.has(productId));
  const fieldMismatches: string[] = [];

  for (const product of products) {
    const entry = snapshot.products[product.id];
    if (!entry) continue;

    if (entry.productId !== product.id) {
      fieldMismatches.push(`${product.id}: productId is ${entry.productId}`);
    }
    if (entry.planTier !== product.subscriptionTier) {
      fieldMismatches.push(`${product.id}: planTier is ${entry.planTier}, expected ${product.subscriptionTier}`);
    }
    if (entry.licenseMode !== product.licenseMode) {
      fieldMismatches.push(`${product.id}: licenseMode is ${entry.licenseMode}, expected ${product.licenseMode}`);
    }
  }

  return {
    complete: missingProductIds.length === 0 && orphanProductIds.length === 0 && fieldMismatches.length === 0,
    deploymentProductCount: products.length,
    mappedProductCount: snapshotIds.size,
    missingProductIds,
    orphanProductIds,
    fieldMismatches,
  };
}

export const monetizationCoverage = collectCoverageProblems(monetizationPlan);

export function assertMonetizationPlanCoverage(snapshot = monetizationPlan) {
  const coverage = collectCoverageProblems(snapshot);
  if (coverage.complete) return;

  throw new Error(
    [
      "Monetization plan does not cover the deployment catalog.",
      coverage.missingProductIds.length ? `Missing: ${coverage.missingProductIds.join(", ")}` : "",
      coverage.orphanProductIds.length ? `Orphaned: ${coverage.orphanProductIds.join(", ")}` : "",
      coverage.fieldMismatches.length ? `Mismatched: ${coverage.fieldMismatches.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

assertMonetizationPlanCoverage();

function fallbackMonetizationPlanForProduct(productId: string): MonetizationPlanEntry | null {
  const product = products.find((candidate) => candidate.id === productId);
  if (!product) return null;

  const planId =
    product.subscriptionTier === "Enterprise"
      ? "enterprise"
      : product.subscriptionTier === "Studio"
        ? "studio"
        : product.subscriptionTier === "Pro"
          ? "suite"
          : "core";
  const href = product.loginUrl || product.paymentUrl || product.productionUrl || `/apps/${encodeURIComponent(product.id)}`;

  return {
    productId: product.id,
    planTier: product.subscriptionTier,
    funnelPlanId: planId,
    licenseMode: product.licenseMode,
    routeAfterPurchase: {
      type: product.productionUrl ? "production-url" : "command-center",
      href,
    },
    needsDemoVideo: true,
    publicInFunnel: true,
    healthGate: {
      status: product.isLive ? "healthy" : "unknown",
      behavior: product.isLive ? "allow-checkout-with-warning" : "manual-review",
      reason: "Imported from the ILLCO Command app registry. Checkout is routed through guided setup unless a reviewed monetization entry exists.",
    },
  };
}

export function getMonetizationPlan(productId: string) {
  return monetizationPlan.products[productId] || fallbackMonetizationPlanForProduct(productId);
}

export function getProductMonetization(productId: string) {
  const product = products.find((candidate) => candidate.id === productId);
  const monetization = product ? getMonetizationPlan(product.id) : null;
  return product && monetization ? { ...product, monetization } : null;
}

export const monetizedProducts = products.map((product) => ({
  ...product,
  monetization: getMonetizationPlan(product.id) as MonetizationPlanEntry,
}));

export function canOfferPublicCheckout(productId: string) {
  const plan = getMonetizationPlan(productId);
  return Boolean(plan?.publicInFunnel && plan.healthGate.behavior === "allow-checkout");
}

export function getProductsNeedingDemoVideo() {
  return monetizedProducts.filter((product) => product.monetization.needsDemoVideo);
}
