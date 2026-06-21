import fs from "node:fs/promises";
import path from "node:path";

import demoVideoSnapshot from "../data/demo-videos.json";
import healthSnapshot from "../data/project-health.json";
import {
  deploymentSnapshotTakenAt,
  featuredProductIds,
  products,
  type ProductRecord,
} from "../lib/deployments";

type FunnelPlanId = "core" | "studio" | "agency" | "enterprise";
type HealthStatus = "healthy" | "degraded" | "offline" | "unknown";
type HealthGateBehavior = "allow-checkout" | "allow-checkout-with-warning" | "block-checkout" | "manual-review";
type RouteAfterPurchaseType = "production-url" | "command-center";

type DemoVideoSnapshot = {
  generatedAt: string | null;
  projects: Record<string, {
    youtubeVideoId?: string | null;
    youtubeUrl?: string | null;
    embedUrl?: string | null;
    tutorialYoutubeVideoId?: string | null;
    tutorialYoutubeUrl?: string | null;
    tutorialEmbedUrl?: string | null;
    tutorialDurationSeconds?: number | null;
    tutorialIncludesCaptions?: boolean | null;
    tutorialIncludesHighlights?: boolean | null;
    tutorialIncludesNarration?: boolean | null;
    tutorialPacing?: string | null;
  }>;
};

type ProjectHealthSnapshot = {
  generatedAt: string | null;
  projects: Record<string, { status?: HealthStatus | null }>;
};

type MonetizationPlanEntry = {
  productId: string;
  planTier: ProductRecord["subscriptionTier"];
  funnelPlanId: FunnelPlanId;
  licenseMode: ProductRecord["licenseMode"];
  routeAfterPurchase: {
    type: RouteAfterPurchaseType;
    href: string;
  };
  needsDemoVideo: boolean;
  publicInFunnel: boolean;
  healthGate: {
    status: HealthStatus;
    behavior: HealthGateBehavior;
    reason: string;
  };
};

const outputPath = path.resolve("data/monetization-plan.json");
const featuredProductIdSet = new Set(featuredProductIds);
const demoVideos = demoVideoSnapshot as DemoVideoSnapshot;
const projectHealth = healthSnapshot as ProjectHealthSnapshot;
const minimumTutorialDurationSeconds = 120;

function funnelPlanIdFor(tier: ProductRecord["subscriptionTier"]): FunnelPlanId {
  if (tier === "Core") return "core";
  if (tier === "Studio") return "studio";
  if (tier === "Enterprise") return "enterprise";
  return "agency";
}

function commandCenterSuccessRoute(productId: string) {
  if (productId === "ai-companions-recovered") {
    return `/tools?checkout=success&productId=${encodeURIComponent(productId)}`;
  }

  return `/?checkout=success&productId=${encodeURIComponent(productId)}`;
}

function routeAfterPurchase(product: ProductRecord): MonetizationPlanEntry["routeAfterPurchase"] {
  if (product.productionUrl && product.licenseMode !== "internal") {
    return {
      type: "production-url",
      href: product.productionUrl,
    };
  }

  return {
    type: "command-center",
    href: commandCenterSuccessRoute(product.id),
  };
}

function isInfrastructureProduct(product: ProductRecord) {
  if (product.licenseMode === "internal") return true;

  return /(^\.|^src$|^out$|^web$|^frontend$|^backend(?:-node)?$|^workspace$|^assets$|tmp|test|repo|webhook|offline|no-mock-data)/i.test(
    product.name,
  );
}

function isPublicBackendProduct(product: ProductRecord) {
  return featuredProductIdSet.has(product.id) || /(license|gateway|payments|commerce)/i.test(product.name);
}

function isSeparatedCompanionModule(product: ProductRecord) {
  return product.id.startsWith("ai-companion-");
}

function shouldBePublicInFunnel(product: ProductRecord) {
  if (!product.isLive) return false;
  if (isSeparatedCompanionModule(product)) return false;
  if (isInfrastructureProduct(product)) return false;
  if (product.category === "experimental" && !featuredProductIdSet.has(product.id)) return false;
  if (product.category === "backend" && !isPublicBackendProduct(product)) return false;
  return true;
}

function healthStatusFor(product: ProductRecord): HealthStatus {
  const status = projectHealth.projects[product.id]?.status || (product.isLive ? "unknown" : "offline");
  if (status === "healthy" || status === "degraded" || status === "offline") return status;
  return "unknown";
}

function healthGateFor(product: ProductRecord, publicInFunnel: boolean): MonetizationPlanEntry["healthGate"] {
  const status = healthStatusFor(product);

  if (isSeparatedCompanionModule(product)) {
    return {
      status,
      behavior: "block-checkout",
      reason: "Separated AI companion modules stay locked behind the reviewed ILLCO Tools bundle.",
    };
  }

  if (!product.productionUrl) {
    return {
      status,
      behavior: "block-checkout",
      reason: "No production URL is assigned, so checkout must not route buyers into a dead end.",
    };
  }

  if (status === "offline") {
    return {
      status,
      behavior: "block-checkout",
      reason: "Latest health audit marked the deployment offline.",
    };
  }

  if (!publicInFunnel) {
    return {
      status,
      behavior: "manual-review",
      reason: "Catalog rules keep this product out of the public funnel; sell only through a reviewed flow.",
    };
  }

  if (status === "healthy") {
    return {
      status,
      behavior: "allow-checkout",
      reason: "Live deployment passed the latest health gate.",
    };
  }

  if (status === "degraded") {
    return {
      status,
      behavior: "block-checkout",
      reason: "Deployment is degraded, so checkout and customer access stay locked until the app is verified working.",
    };
  }

  return {
    status,
    behavior: "manual-review",
    reason: "No conclusive health signal exists for this live deployment.",
  };
}

function hasDemoVideo(productId: string) {
  const record = demoVideos.projects[productId];
  if (!record?.tutorialYoutubeVideoId || !record.tutorialEmbedUrl) return false;
  if (!record.tutorialIncludesCaptions || !record.tutorialIncludesHighlights || !record.tutorialIncludesNarration) {
    return false;
  }
  if (record.tutorialPacing !== "slow") return false;
  return (record.tutorialDurationSeconds || 0) >= minimumTutorialDurationSeconds;
}

function needsDemoVideo(product: ProductRecord, publicInFunnel: boolean) {
  if (!publicInFunnel) return false;
  if (product.category === "backend" || product.licenseMode === "usage") return false;
  return !hasDemoVideo(product.id);
}

function createPlanEntry(product: ProductRecord): MonetizationPlanEntry {
  const publicInFunnel = shouldBePublicInFunnel(product);

  return {
    productId: product.id,
    planTier: product.subscriptionTier,
    funnelPlanId: funnelPlanIdFor(product.subscriptionTier),
    licenseMode: product.licenseMode,
    routeAfterPurchase: routeAfterPurchase(product),
    needsDemoVideo: needsDemoVideo(product, publicInFunnel),
    publicInFunnel,
    healthGate: healthGateFor(product, publicInFunnel),
  };
}

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<T, number>>(
    (counts, value) => {
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    },
    {} as Record<T, number>,
  );
}

async function main() {
  const entries = products.map(createPlanEntry);
  const projects = Object.fromEntries(entries.map((entry) => [entry.productId, entry]));
  const snapshot = {
    schemaVersion: 1,
    generatedAt: deploymentSnapshotTakenAt,
    sources: {
      deploymentSnapshotTakenAt,
      healthSnapshotGeneratedAt: projectHealth.generatedAt,
      demoVideoSnapshotGeneratedAt: demoVideos.generatedAt,
    },
    summary: {
      totalProducts: entries.length,
      publicInFunnel: entries.filter((entry) => entry.publicInFunnel).length,
      needsDemoVideo: entries.filter((entry) => entry.needsDemoVideo).length,
      healthGateBehavior: countBy(entries.map((entry) => entry.healthGate.behavior)),
    },
    products: projects,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify(snapshot.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
