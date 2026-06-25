import fs from "node:fs";
import path from "node:path";

type ProductPlan = {
  productId: string;
  publicInFunnel?: boolean;
  needsDemoVideo?: boolean;
  healthGate?: {
    status?: string;
    behavior?: string;
    reason?: string;
  };
};

type MonetizationSnapshot = {
  generatedAt?: string;
  products?: Record<string, ProductPlan>;
};

type DemoRecord = {
  youtubeUploadStatus?: string;
  youtubeUrl?: string;
  tutorialYoutubeUploadStatus?: string;
  tutorialYoutubeUrl?: string;
  tutorialDurationSeconds?: number;
  twoMinuteProofDurationSeconds?: number;
  twoMinuteProofStatus?: string;
  twoMinuteProofLocalVideoPath?: string;
  tutorialIncludesCaptions?: boolean;
  tutorialIncludesHighlights?: boolean;
  tutorialIncludesNarration?: boolean;
  localVideoPath?: string;
  localVideoBytes?: number;
  [key: string]: unknown;
};

type DemoSnapshot = {
  generatedAt?: string;
  projects?: Record<string, DemoRecord>;
};

type HealthSnapshot = {
  generatedAt?: string;
  projects?: Record<string, { status?: string; title?: string; statusCode?: number; error?: string | null }>;
};

type QueueItem = {
  productId: string;
  title: string;
  priority: number;
  health: string;
  checkoutBehavior: string;
  publicInFunnel: boolean;
  needsDemoVideo: boolean;
  proofStatus: "two_minute_ready" | "short_demo_ready" | "needs_recording" | "blocked";
  requiredAction: string;
  currentProofUrl: string | null;
  tutorialDurationSeconds: number | null;
};

const root = path.resolve(__dirname, "..");
const monetization = JSON.parse(fs.readFileSync(path.join(root, "data", "monetization-plan.json"), "utf8")) as MonetizationSnapshot;
const demos = JSON.parse(fs.readFileSync(path.join(root, "data", "demo-videos.json"), "utf8")) as DemoSnapshot;
const health = JSON.parse(fs.readFileSync(path.join(root, "data", "project-health.json"), "utf8")) as HealthSnapshot;

function titleFor(productId: string) {
  return health.projects?.[productId]?.title || productId.replace(/-/g, " ");
}

function proofStatus(productId: string, plan: ProductPlan): QueueItem["proofStatus"] {
  const demo = demos.projects?.[productId];
  if (plan.healthGate?.behavior !== "allow-checkout") return "blocked";
  if (
    (demo?.twoMinuteProofDurationSeconds || 0) >= 120 &&
    (demo?.twoMinuteProofStatus === "recorded" || demo?.twoMinuteProofYoutubeVideoId)
  ) {
    return "two_minute_ready";
  }
  if ((demo?.tutorialDurationSeconds || 0) >= 120 && demo?.tutorialIncludesCaptions && demo?.tutorialIncludesHighlights && demo?.tutorialIncludesNarration) {
    return "two_minute_ready";
  }
  if (demo?.youtubeUploadStatus === "uploaded" || demo?.localVideoBytes) return "short_demo_ready";
  return "needs_recording";
}

function requiredAction(status: QueueItem["proofStatus"]) {
  if (status === "two_minute_ready") return "No action. Two-minute tutorial proof already exists.";
  if (status === "short_demo_ready") return "Record or assemble two-minute tutorial proof from existing short demo.";
  if (status === "blocked") return "Keep locked/request-only until product health and checkout gate pass.";
  return "Record two-minute tutorial proof before direct public checkout.";
}

const items: QueueItem[] = Object.values(monetization.products || {})
  .filter((plan) => plan.publicInFunnel)
  .map((plan) => {
    const demo = demos.projects?.[plan.productId];
    const status = proofStatus(plan.productId, plan);
    const priority =
      status === "needs_recording" ? 1 :
        status === "short_demo_ready" ? 2 :
          status === "two_minute_ready" ? 3 :
            4;

    return {
      productId: plan.productId,
      title: titleFor(plan.productId),
      priority,
      health: plan.healthGate?.status || health.projects?.[plan.productId]?.status || "unknown",
      checkoutBehavior: plan.healthGate?.behavior || "unknown",
      publicInFunnel: Boolean(plan.publicInFunnel),
      needsDemoVideo: Boolean(plan.needsDemoVideo),
      proofStatus: status,
      requiredAction: requiredAction(status),
      currentProofUrl: demo?.tutorialYoutubeUrl || demo?.youtubeUrl || null,
      tutorialDurationSeconds: typeof demo?.tutorialDurationSeconds === "number"
        ? demo.tutorialDurationSeconds
        : typeof demo?.twoMinuteProofDurationSeconds === "number"
          ? demo.twoMinuteProofDurationSeconds
          : null,
    };
  })
  .sort((a, b) => a.priority - b.priority || a.productId.localeCompare(b.productId));

const summary = {
  generatedAt: new Date().toISOString(),
  scope: "publicInFunnel products",
  targetDurationSeconds: 120,
  total: items.length,
  twoMinuteReady: items.filter((item) => item.proofStatus === "two_minute_ready").length,
  shortDemoReady: items.filter((item) => item.proofStatus === "short_demo_ready").length,
  needsRecording: items.filter((item) => item.proofStatus === "needs_recording").length,
  blocked: items.filter((item) => item.proofStatus === "blocked").length,
};

const output = { summary, items };
fs.writeFileSync(path.join(root, "data", "video-proof-queue.json"), `${JSON.stringify(output, null, 2)}\n`);

const rows = items
  .map((item) => {
    const proof = item.currentProofUrl ? `[proof](${item.currentProofUrl})` : "";
    return `| \`${item.productId}\` | ${item.proofStatus} | ${item.health} | ${item.checkoutBehavior} | ${item.tutorialDurationSeconds ?? ""} | ${item.requiredAction} ${proof} |`;
  })
  .join("\n");

const markdown = `# Two-Minute Product Proof Queue

Generated: ${summary.generatedAt}
Scope: ${summary.scope}
Target duration: ${summary.targetDurationSeconds} seconds per product

## Summary

| Status | Count |
|---|---:|
| Total public-funnel products | ${summary.total} |
| Two-minute proof ready | ${summary.twoMinuteReady} |
| Short demo ready | ${summary.shortDemoReady} |
| Needs recording | ${summary.needsRecording} |
| Blocked / keep locked | ${summary.blocked} |

## Queue

| Product | Proof status | Health | Checkout gate | Tutorial seconds | Required action |
|---|---|---|---|---:|---|
${rows}
`;

fs.writeFileSync(path.join(root, "docs", "TWO_MINUTE_VIDEO_PROOF_QUEUE.md"), markdown);
console.log(JSON.stringify(summary, null, 2));
