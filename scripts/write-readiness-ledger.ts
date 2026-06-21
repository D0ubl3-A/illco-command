import fs from "node:fs/promises";
import path from "node:path";

type HealthGateBehavior = "allow-checkout" | "allow-checkout-with-warning" | "block-checkout" | "manual-review";
type HealthStatus = "healthy" | "degraded" | "offline" | "unknown";

type MonetizationEntry = {
  productId: string;
  planTier: string;
  funnelPlanId: string;
  licenseMode: string;
  needsDemoVideo: boolean;
  publicInFunnel: boolean;
  routeAfterPurchase: {
    type: string;
    href: string;
  };
  healthGate: {
    status: HealthStatus;
    behavior: HealthGateBehavior;
    reason: string;
  };
};

type MonetizationSnapshot = {
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
    healthGateBehavior: Partial<Record<HealthGateBehavior, number>>;
  };
  products: Record<string, MonetizationEntry>;
};

type HealthProjectRecord = {
  status?: HealthStatus;
  statusCode?: number | null;
  title?: string | null;
  error?: string | null;
};

type HealthSnapshot = {
  generatedAt: string | null;
  summary?: {
    checked?: number;
    healthy?: number;
    degraded?: number;
    offline?: number;
  };
  projects?: Record<string, HealthProjectRecord>;
};

type DemoProjectRecord = {
  youtubeVideoId?: string | null;
  tutorialYoutubeVideoId?: string | null;
  resultProofYoutubeVideoId?: string | null;
  tutorialIncludesCaptions?: boolean | null;
  tutorialIncludesHighlights?: boolean | null;
  tutorialIncludesNarration?: boolean | null;
  tutorialPacing?: string | null;
  tutorialDurationSeconds?: number | null;
};

type DemoSnapshot = {
  generatedAt: string | null;
  projects?: Record<string, DemoProjectRecord>;
};

export type ReadinessState = "working" | "locked" | "manual-review";

export type ReadinessRow = {
  productId: string;
  state: ReadinessState;
  publicInFunnel: boolean;
  planTier: string;
  healthStatus: HealthStatus;
  healthGate: HealthGateBehavior;
  needsDemoVideo: boolean;
  proofReady: boolean;
  routeType: string;
  routeHref: string;
  reason: string;
  nextAction: string;
};

export type ReadinessLedger = {
  generatedAt: string;
  summary: {
    totalProducts: number;
    working: number;
    locked: number;
    manualReview: number;
    publicInFunnel: number;
    needsDemoVideo: number;
    proofReady: number;
    checkoutWarning: number;
    healthChecked: number;
    healthHealthy: number;
    healthDegraded: number;
    healthOffline: number;
  };
  rows: ReadinessRow[];
};

const monetizationPath = path.resolve("data/monetization-plan.json");
const healthPath = path.resolve("data/project-health.json");
const demoPath = path.resolve("data/demo-videos.json");
const artifactPath = path.resolve("artifacts/readiness-ledger.json");
const docsPath = path.resolve("docs/ALL_APP_READINESS_LEDGER.md");

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

function hasProof(record: DemoProjectRecord | undefined) {
  if (!record) return false;
  if (record.resultProofYoutubeVideoId) return true;
  if (record.tutorialYoutubeVideoId) {
    return Boolean(
      record.tutorialIncludesCaptions &&
        record.tutorialIncludesHighlights &&
        record.tutorialIncludesNarration &&
        record.tutorialPacing === "slow" &&
        (record.tutorialDurationSeconds || 0) >= 120,
    );
  }
  return Boolean(record.youtubeVideoId);
}

function stateFor(entry: MonetizationEntry): ReadinessState {
  if (entry.healthGate.behavior === "block-checkout") return "locked";
  if (entry.healthGate.behavior === "manual-review") return "manual-review";
  if (entry.healthGate.behavior === "allow-checkout" && entry.healthGate.status === "healthy") return "working";
  return "locked";
}

function nextActionFor(entry: MonetizationEntry, proofReady: boolean, health?: HealthProjectRecord) {
  if (entry.healthGate.behavior === "block-checkout") {
    return health?.error || entry.healthGate.reason || "Resolve the blocking health/access gate before selling.";
  }
  if (entry.healthGate.behavior === "manual-review") {
    return "Complete manual review or keep the product request-only.";
  }
  if (entry.needsDemoVideo && !proofReady) {
    return "Add non-Gemini proof/tutorial coverage or keep demo work queued if Gemini-dependent.";
  }
  return "Keep monitored; verify checkout, access, docs, and proof remain current.";
}

export function buildReadinessLedger(
  monetization: MonetizationSnapshot,
  health: HealthSnapshot,
  demo: DemoSnapshot,
): ReadinessLedger {
  const rows = Object.values(monetization.products)
    .map((entry) => {
      const healthRecord = health.projects?.[entry.productId];
      const proofReady = hasProof(demo.projects?.[entry.productId]);
      const state = stateFor(entry);

      return {
        productId: entry.productId,
        state,
        publicInFunnel: entry.publicInFunnel,
        planTier: entry.planTier,
        healthStatus: entry.healthGate.status,
        healthGate: entry.healthGate.behavior,
        needsDemoVideo: entry.needsDemoVideo,
        proofReady,
        routeType: entry.routeAfterPurchase.type,
        routeHref: entry.routeAfterPurchase.href,
        reason: entry.healthGate.reason,
        nextAction: nextActionFor(entry, proofReady, healthRecord),
      } satisfies ReadinessRow;
    })
    .sort((left, right) => {
      const rank: Record<ReadinessState, number> = { locked: 0, "manual-review": 1, working: 2 };
      return rank[left.state] - rank[right.state] || left.productId.localeCompare(right.productId);
    });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalProducts: rows.length,
      working: rows.filter((row) => row.state === "working").length,
      locked: rows.filter((row) => row.state === "locked").length,
      manualReview: rows.filter((row) => row.state === "manual-review").length,
      publicInFunnel: rows.filter((row) => row.publicInFunnel).length,
      needsDemoVideo: rows.filter((row) => row.needsDemoVideo).length,
      proofReady: rows.filter((row) => row.proofReady).length,
      checkoutWarning: rows.filter((row) => row.healthGate === "allow-checkout-with-warning").length,
      healthChecked: health.summary?.checked || 0,
      healthHealthy: health.summary?.healthy || 0,
      healthDegraded: health.summary?.degraded || 0,
      healthOffline: health.summary?.offline || 0,
    },
    rows,
  };
}

function topRows(rows: ReadinessRow[], state: ReadinessState, count: number) {
  return rows
    .filter((row) => row.state === state)
    .slice(0, count)
    .map((row) => `| \`${row.productId}\` | ${row.healthStatus} | ${row.nextAction.replace(/\|/g, "/")} |`)
    .join("\n");
}

function renderMarkdown(ledger: ReadinessLedger, monetization: MonetizationSnapshot, demo: DemoSnapshot) {
  const lockedRows = topRows(ledger.rows, "locked", 20);
  const manualRows = topRows(ledger.rows, "manual-review", 20);
  const demoQueue = ledger.rows
    .filter((row) => row.needsDemoVideo)
    .slice(0, 20)
    .map((row) => `| \`${row.productId}\` | ${row.healthStatus} | ${row.proofReady ? "proof exists" : "proof needed"} |`)
    .join("\n");

  return `# All-App Readiness Ledger

Generated: ${ledger.generatedAt}

## Snapshot

- Total products: ${ledger.summary.totalProducts}
- Public funnel products: ${ledger.summary.publicInFunnel}
- Working products: ${ledger.summary.working}
- Locked products: ${ledger.summary.locked}
- Manual review products: ${ledger.summary.manualReview}
- Products needing demo video: ${ledger.summary.needsDemoVideo}
- Proof-ready products: ${ledger.summary.proofReady}
- Checkout-warning products: ${ledger.summary.checkoutWarning}

## Source Freshness

- Monetization snapshot: ${monetization.generatedAt}
- Health snapshot: ${monetization.sources.healthSnapshotGeneratedAt || "not generated"}
- Demo snapshot: ${demo.generatedAt || "not generated"}

## Health Audit

- Checked: ${ledger.summary.healthChecked}
- Healthy: ${ledger.summary.healthHealthy}
- Degraded: ${ledger.summary.healthDegraded}
- Offline: ${ledger.summary.healthOffline}

## Done Definition

Each product must end in one of two states:

- Working: production URL is healthy, UI is customer-safe, auth/env/payment/access routes pass, proof is ready when required, docs exist, and verification commands pass.
- Locked: checkout and customer access are blocked, the public UI says locked/manual review, and the remediation reason is explicit.

## Top Locked Queue

| Product | Health | Next action |
| --- | --- | --- |
${lockedRows || "| none | none | none |"}

## Top Manual Review Queue

| Product | Health | Next action |
| --- | --- | --- |
${manualRows || "| none | none | none |"}

## Top Demo Queue

Gemini-dependent video work remains paused until explicit owner approval.

| Product | Health | Proof status |
| --- | --- | --- |
${demoQueue || "| none | none | none |"}

## Current Priority Order

1. Keep all degraded/offline apps locked.
2. Resolve manual-review apps with a real risk/access decision.
3. Add missing proof/tutorial coverage without using Gemini-dependent workflows.
4. Package and document apps that are already healthy.
5. Unlock only after tests, typecheck, build, and health/monetization sync pass.
`;
}

async function main() {
  const monetization = await readJson<MonetizationSnapshot>(monetizationPath);
  const health = await readJson<HealthSnapshot>(healthPath);
  const demo = await readJson<DemoSnapshot>(demoPath);
  const ledger = buildReadinessLedger(monetization, health, demo);

  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.writeFile(artifactPath, `${JSON.stringify(ledger, null, 2)}\n`);
  await fs.mkdir(path.dirname(docsPath), { recursive: true });
  await fs.writeFile(docsPath, renderMarkdown(ledger, monetization, demo));
  console.log(JSON.stringify(ledger.summary, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
