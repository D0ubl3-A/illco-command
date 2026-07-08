import appRegistrySnapshot from "@/data/apps.json";

export type DeploymentProject = {
  name: string;
  productionUrl: string | null;
  updated: string;
  nodeVersion: string;
};

export type ProductCategory =
  | "command"
  | "media"
  | "automation"
  | "commerce"
  | "realEstate"
  | "backend"
  | "experimental";

export type ProductRecord = DeploymentProject & {
  id: string;
  displayName: string;
  category: ProductCategory;
  subscriptionTier: "Core" | "Pro" | "Studio" | "Enterprise";
  licenseMode: "subscription" | "seat" | "usage" | "internal";
  isLive: boolean;
  registrySource?: "deployment-snapshot" | "illco-command-registry";
  description?: string;
  imageUrl?: string;
  liveUrl?: string;
  paymentUrl?: string;
  loginUrl?: string;
  primaryCta?: string;
  stage?: string;
  saleStatus?: string;
  owner?: string;
  checkoutOfferId?: string;
  accessModel?: string;
  fulfillmentPath?: string;
  priceCents?: number;
  displayed?: boolean;
  ssoConnected?: boolean;
  requiresLogin?: boolean;
  demoUrl?: string;
  demoEmbedUrl?: string;
};

type ProductOverride = Partial<Pick<ProductRecord, "displayName" | "category" | "subscriptionTier" | "licenseMode">>;

type IllcoRegistryEntry = {
  id?: string;
  name?: string;
  type?: string;
  stage?: string;
  liveUrl?: string;
  paymentUrl?: string;
  loginUrl?: string;
  ssoConnected?: boolean;
  requiresLogin?: boolean;
  displayed?: boolean;
  demoUrl?: string;
  demoEmbedUrl?: string;
  owner?: string;
  notes?: string;
  checkoutOfferId?: string;
  saleStatus?: string;
  fulfillmentPath?: string;
  priceCents?: number;
  primaryCta?: string;
  imageUrl?: string;
  accessModel?: string;
};

type IllcoRegistrySnapshot = {
  updatedAt?: string;
  apps?: IllcoRegistryEntry[];
};

export const deploymentSnapshotTakenAt = "2026-05-20T09:24:00-07:00";
export const vercelScope = "illcoai";

export const deploymentProjects = [
  { name: "ai-companions-recovered", productionUrl: "https://illcoai.tech", updated: "production Commander interface", nodeVersion: "20.x" },
  {
    name: "ai-companion-conversational-intake",
    productionUrl: "https://illcoai.tech/apps/ai-companion-conversational-intake",
    updated: "Command module landing",
    nodeVersion: "20.x",
  },
  {
    name: "ai-companion-prompt-studio",
    productionUrl: "https://illcoai.tech/apps/ai-companion-prompt-studio",
    updated: "Command module landing",
    nodeVersion: "20.x",
  },
  {
    name: "ai-companion-content-production",
    productionUrl: "https://illcoai.tech/apps/ai-companion-content-production",
    updated: "Command module landing",
    nodeVersion: "20.x",
  },
  {
    name: "ai-companion-sales-agent-handoff",
    productionUrl: "https://illcoai.tech/apps/ai-companion-sales-agent-handoff",
    updated: "Command module landing",
    nodeVersion: "20.x",
  },
  {
    name: "ai-companion-command-routing",
    productionUrl: "https://illcoai.tech/apps/ai-companion-command-routing",
    updated: "Command module landing",
    nodeVersion: "20.x",
  },
  {
    name: "ai-companion-workspace-access",
    productionUrl: "https://illcoai.tech/apps/ai-companion-workspace-access",
    updated: "Command module landing",
    nodeVersion: "20.x",
  },
  {
    name: "think-for-me-mode",
    productionUrl: "https://illcoai.tech/tools/think-for-me-mode",
    updated: "premium helper product",
    nodeVersion: "20.x",
  },
  {
    name: "lyric-video-forge",
    productionUrl: "https://illcoai.tech/tools/lyric-video-forge",
    updated: "Agent SDK lyric video workflow",
    nodeVersion: "20.x",
  },
  { name: "viral-stitch-ai", productionUrl: null, updated: "local desktop license integration", nodeVersion: "24.x" },
  { name: "barz-web-studio", productionUrl: null, updated: "Command module landing", nodeVersion: "24.x" },
  { name: ".barz", productionUrl: null, updated: "34s", nodeVersion: "24.x" },
  { name: "epstein-files-desk", productionUrl: null, updated: "local source recovered; redeploy required", nodeVersion: "24.x" },
  { name: "uap-ai-lab", productionUrl: "https://uap-ai-lab.vercel.app", updated: "34m", nodeVersion: "24.x" },
  { name: "why-not-me-ai", productionUrl: "https://why-not-me-ai.vercel.app", updated: "10h", nodeVersion: "24.x" },
  { name: "video-margin-ai", productionUrl: "https://video-margin-ai.vercel.app", updated: "12h", nodeVersion: "24.x" },
  { name: "vercel-reporter", productionUrl: "https://vercel-reporter.vercel.app", updated: "12h", nodeVersion: "24.x" },
  { name: "mastering-studio-platform", productionUrl: "https://mastering-studio-platform.vercel.app", updated: "1d", nodeVersion: "24.x" },
  { name: "youtube_ops_vercel", productionUrl: "https://youtubeopsvercel.vercel.app", updated: "3d", nodeVersion: "24.x" },
  { name: "visual-voice-board", productionUrl: "https://visual-voice-board.vercel.app", updated: "4d", nodeVersion: "24.x" },
  { name: "codexgroq", productionUrl: "https://codexgroq.vercel.app", updated: "4d", nodeVersion: "24.x" },
  { name: "sora-catalog-vercel-preview", productionUrl: null, updated: "17d", nodeVersion: "24.x" },
  { name: "sora_vault_cloud", productionUrl: "https://soravaultcloud.vercel.app", updated: "17d", nodeVersion: "24.x" },
  { name: "rap-lyric-generator", productionUrl: "https://rap-lyric-generator.vercel.app", updated: "17d", nodeVersion: "24.x" },
  { name: "voice-book-tool", productionUrl: "https://voice-book-tool-illcoai.vercel.app", updated: "19d", nodeVersion: "24.x" },
  { name: "illco-ai-video", productionUrl: "https://illco-ai-video.vercel.app", updated: "22d", nodeVersion: "24.x" },
  { name: "illco-ai-funnel", productionUrl: "https://illco-ai-funnel.vercel.app", updated: "22d", nodeVersion: "24.x" },
  { name: "ai-dev-co-funnel", productionUrl: "https://ai-dev-co-funnel.vercel.app", updated: "22d", nodeVersion: "24.x" },
  { name: "ship-fast-test", productionUrl: "https://ship-fast-test-illcoai.vercel.app", updated: "31d", nodeVersion: "24.x" },
  { name: "nexus-lab", productionUrl: "https://nexus-lab-eta.vercel.app", updated: "31d", nodeVersion: "24.x" },
  { name: "tshirtworkshop", productionUrl: "https://tshirtworkshop.vercel.app", updated: "31d", nodeVersion: "24.x" },
  { name: "bigostreets", productionUrl: "https://bigostreets.vercel.app", updated: "40d", nodeVersion: "24.x" },
  { name: "green-gator-pools", productionUrl: "https://green-gator-pools.vercel.app", updated: "41d", nodeVersion: "24.x" },
  { name: "battle-rap-ai", productionUrl: "https://illcoai.tech", updated: "42d", nodeVersion: "24.x" },
  { name: "diss-track-site", productionUrl: "https://diss-track-site.vercel.app", updated: "43d", nodeVersion: "24.x" },
  { name: "debate-league-jcld", productionUrl: "https://debate-league-jcld-illcoai.vercel.app", updated: "43d", nodeVersion: "24.x" },
  { name: "bigo-live-news", productionUrl: "https://bigo-live-news.vercel.app", updated: "43d", nodeVersion: "24.x" },
  { name: "radio-edit-studio", productionUrl: "https://radio-edit-studio.vercel.app", updated: "43d", nodeVersion: "24.x" },
  { name: "dj-curse-reverse", productionUrl: "https://dj-curse-reverse.vercel.app", updated: "live monetized launch", nodeVersion: "24.x" },
  { name: "assets", productionUrl: "https://assets-eta-two.vercel.app", updated: "44d", nodeVersion: "24.x" },
  { name: "sora2-petition", productionUrl: "https://sora2-petition.vercel.app", updated: "46d", nodeVersion: "24.x" },
  { name: "aaron", productionUrl: null, updated: "46d", nodeVersion: "24.x" },
  { name: "ltb-tool-payments", productionUrl: "https://ltb-tool-payments.vercel.app", updated: "51d", nodeVersion: "24.x" },
  { name: "lvl-up-agency", productionUrl: "https://lvl-up-agency.vercel.app", updated: "51d", nodeVersion: "24.x" },
  { name: "automateflow", productionUrl: "https://automateflow-eta.vercel.app", updated: "51d", nodeVersion: "24.x" },
  { name: "ill-motion-ai", productionUrl: "https://ill-motion-ai.vercel.app", updated: "56d", nodeVersion: "24.x" },
  { name: "brii-baby", productionUrl: "https://brii-baby.vercel.app", updated: "56d", nodeVersion: "24.x" },
  { name: "cortex-intelligence", productionUrl: "https://cortex-intelligence-gamma.vercel.app", updated: "57d", nodeVersion: "24.x" },
  { name: "illcoappiverse", productionUrl: "https://illcoappiverse.vercel.app", updated: "57d", nodeVersion: "24.x" },
  { name: "backend", productionUrl: "https://backend-illcoai.vercel.app", updated: "58d", nodeVersion: "24.x" },
  { name: "ghettobirddemo", productionUrl: "https://ghettobirddemo.vercel.app", updated: "62d", nodeVersion: "24.x" },
  { name: "music-video-clip-site", productionUrl: "https://music-video-clip-site.vercel.app", updated: "64d", nodeVersion: "24.x" },
  { name: "online-store-radio-edit", productionUrl: "https://online-store-radio-edit.vercel.app", updated: "71d", nodeVersion: "24.x" },
  { name: "nexus-workstation", productionUrl: "https://nexus-workstation.vercel.app", updated: "72d", nodeVersion: "24.x" },
  { name: "lottery-pattern-analyzer", productionUrl: "https://lottery-pattern-analyzer.vercel.app", updated: "77d", nodeVersion: "24.x" },
  { name: "backend-node", productionUrl: "https://backend-node-rust.vercel.app", updated: "92d", nodeVersion: "24.x" },
  { name: "frontend", productionUrl: "https://frontend-illcoai.vercel.app", updated: "92d", nodeVersion: "24.x" },
  { name: "illcoflow", productionUrl: "https://illcoflow.vercel.app", updated: "93d", nodeVersion: "24.x" },
  { name: "codex-agent-app", productionUrl: "https://codex-agent-app.vercel.app", updated: "96d", nodeVersion: "24.x" },
  { name: "lipsync-app", productionUrl: "https://lipsync-app-ten.vercel.app", updated: "97d", nodeVersion: "24.x" },
  { name: "illcoai-tools", productionUrl: "https://illcoai-tools.vercel.app", updated: "97d", nodeVersion: "24.x" },
  { name: "illco-ai-hq", productionUrl: "https://illco-ai-hq.vercel.app", updated: "97d", nodeVersion: "24.x" },
  { name: "notion-webhook", productionUrl: "https://notion-webhook-eta.vercel.app", updated: "97d", nodeVersion: "24.x" },
  { name: "illcoai-api", productionUrl: "https://illcoai-api.vercel.app", updated: "97d", nodeVersion: "20.x" },
  { name: "sbl-sora-battle-league", productionUrl: "https://sbl-sora-battle-league.vercel.app", updated: "99d", nodeVersion: "24.x" },
  { name: "illcoai-offline-v2", productionUrl: "https://illcoai-offline-v2.vercel.app", updated: "99d", nodeVersion: "24.x" },
  { name: "illcoai-upscale-v2", productionUrl: "https://illcoai-upscale-v2.vercel.app", updated: "101d", nodeVersion: "24.x" },
  { name: "powerhouse-app-builder", productionUrl: "https://blackppleats.com", updated: "102d", nodeVersion: "24.x" },
  { name: "notion-api-webhook-repo", productionUrl: "https://notion-api-webhook-repo.vercel.app", updated: "102d", nodeVersion: "24.x" },
  { name: "ops-bot", productionUrl: "https://ops-bot-eight.vercel.app", updated: "102d", nodeVersion: "24.x" },
  { name: "notion-vercel-backend", productionUrl: "https://notion-vercel-backend.vercel.app", updated: "102d", nodeVersion: "24.x" },
  { name: "src", productionUrl: "https://src-illcoai.vercel.app", updated: "102d", nodeVersion: "24.x" },
  { name: "gardening-site", productionUrl: "https://gardening-site-seven.vercel.app", updated: "102d", nodeVersion: "24.x" },
  { name: "gardening-site-grqp", productionUrl: "https://gardening-site-grqp.vercel.app", updated: "102d", nodeVersion: "24.x" },
  { name: "web", productionUrl: "https://web-illcoai.vercel.app", updated: "104d", nodeVersion: "24.x" },
  { name: "real-estate-ai-workstation", productionUrl: "https://real-estate-ai-workstation-illcoai.vercel.app", updated: "105d", nodeVersion: "24.x" },
  { name: "out", productionUrl: "https://out-illcoai.vercel.app", updated: "105d", nodeVersion: "24.x" },
  { name: "ghetto-bird-robot", productionUrl: "https://ghetto-bird-robot.vercel.app", updated: "109d", nodeVersion: "24.x" },
  { name: "vercel-ai-gateway-demo", productionUrl: "https://vercel-ai-gateway-demo-illcoai.vercel.app", updated: "110d", nodeVersion: "24.x" },
  { name: "debate-league", productionUrl: "https://debate-league-illcoai.vercel.app", updated: "112d", nodeVersion: "24.x" },
  { name: "ilco-ops2", productionUrl: "https://ilco-ops2.vercel.app", updated: "112d", nodeVersion: "24.x" },
  { name: "online-store", productionUrl: "https://online-store-illcoai.vercel.app", updated: "114d", nodeVersion: "24.x" },
  { name: "workspace", productionUrl: "https://workspace-illcoai.vercel.app", updated: "114d", nodeVersion: "24.x" },
  { name: "aaron-gateway", productionUrl: "https://aaron-gateway.vercel.app", updated: "114d", nodeVersion: "24.x" },
  { name: "illcoai-homicide-v2", productionUrl: "https://illcoai-homicide-v2.vercel.app", updated: "114d", nodeVersion: "24.x" },
  { name: "tmp-deploy", productionUrl: "https://tmp-deploy-one.vercel.app", updated: "115d", nodeVersion: "24.x" },
  { name: "illcoai-bot-v2", productionUrl: "https://illcoai-bot-v2.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illcoai-bot-api-v2", productionUrl: "https://illcoai-bot-api-v2.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illcoai-lipsync-v2", productionUrl: "https://illcoai-lipsync-v2.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illcoai-lipsync-api-v2", productionUrl: "https://illcoai-lipsync-api-v2.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illcoai-upscale-api-v2", productionUrl: "https://illcoai-upscale-api-v2.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illcoai-book-v2", productionUrl: "https://illcoai-book-v2.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illcoai-book-api-v2", productionUrl: "https://illcoai-book-api-v2.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illcoai-e2b-api-v2", productionUrl: "https://illcoai-e2b-api-v2.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illcoai-e2b-v2", productionUrl: "https://illcoai-e2b-v2.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illcoai-airbnb-v2", productionUrl: "https://illcoai-airbnb-v2.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illcoai-realtor-workflow-v2", productionUrl: "https://illcoai-realtor-workflow-v2.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illcoai-video-generator-deploy", productionUrl: "https://illcoai-video-generator-deploy.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "illco-ai-hq-no-mock-data", productionUrl: "https://illco-ai-hq-no-mock-data.vercel.app", updated: "117d", nodeVersion: "24.x" },
  { name: "whatsapp-ai-bot", productionUrl: "https://whatsapp-ai-bot-beta.vercel.app", updated: "118d", nodeVersion: "24.x" },
  { name: "arc-agentic-commerce-hackathon-2026", productionUrl: "https://arc-agentic-commerce-hackathon-2026.vercel.app", updated: "118d", nodeVersion: "24.x" },
  { name: "workstation", productionUrl: "https://workstation-orpin.vercel.app", updated: "119d", nodeVersion: "24.x" },
  { name: "novastream", productionUrl: "https://novastream-khaki.vercel.app", updated: "119d", nodeVersion: "24.x" },
  { name: "whatsapp-bot-app", productionUrl: "https://whatsapp-bot-app-one.vercel.app", updated: "119d", nodeVersion: "24.x" },
  { name: "whatsapp-bot", productionUrl: "https://whatsapp-bot-illcoai.vercel.app", updated: "119d", nodeVersion: "24.x" },
  { name: "debate-league-pro", productionUrl: "https://debate-league-pro.vercel.app", updated: "120d", nodeVersion: "24.x" },
  { name: "godmode-ui", productionUrl: "https://godmode-ui.vercel.app", updated: "120d", nodeVersion: "24.x" },
  { name: "bookie", productionUrl: "https://bookie-illcoai.vercel.app", updated: "120d", nodeVersion: "24.x" },
  { name: "songanalyzer-deploy", productionUrl: "https://songanalyzer-deploy.vercel.app", updated: "120d", nodeVersion: "24.x" },
  { name: "stock-outlook", productionUrl: "https://stock-outlook.vercel.app", updated: "120d", nodeVersion: "24.x" },
  { name: "debateit", productionUrl: "https://debateit-illcoai.vercel.app", updated: "121d", nodeVersion: "24.x" },
  { name: "debate-league-api", productionUrl: "https://debate-league-api.vercel.app", updated: "121d", nodeVersion: "24.x" },
  { name: "lyricflow-ai", productionUrl: "https://lyricflow-ai-blue.vercel.app", updated: "125d", nodeVersion: "24.x" },
  { name: "debate-league-t49t", productionUrl: "https://debate-league-t49t-illcoai.vercel.app", updated: "129d", nodeVersion: "24.x" },
  { name: "serato", productionUrl: "https://serato.vercel.app", updated: "131d", nodeVersion: "24.x" },
  { name: "master-slideshow", productionUrl: "https://master-slideshow.vercel.app", updated: "132d", nodeVersion: "24.x" },
  { name: "license-validation-api", productionUrl: "https://license-validation-api-tawny.vercel.app", updated: "132d", nodeVersion: "24.x" },
  { name: "stride-enterprise-platform", productionUrl: "https://stride-enterprise-platform.vercel.app", updated: "132d", nodeVersion: "24.x" },
  { name: "bri-babyy", productionUrl: "https://bri-babyy.vercel.app", updated: "132d", nodeVersion: "24.x" },
  { name: "ghetto-bird-voice-ai", productionUrl: "https://ghetto-bird-voice-ai.vercel.app", updated: "134d", nodeVersion: "24.x" },
] satisfies DeploymentProject[];

const productOverridesByName: Record<string, ProductOverride> = {
  "ai-companions-recovered": {
    displayName: "ILLCO Tools",
    category: "automation",
    subscriptionTier: "Studio",
    licenseMode: "seat",
  },
  "ai-companion-conversational-intake": {
    displayName: "AI Companion: Conversational Intake",
    category: "automation",
    subscriptionTier: "Studio",
    licenseMode: "seat",
  },
  "ai-companion-prompt-studio": {
    displayName: "AI Companion: Prompt Studio",
    category: "automation",
    subscriptionTier: "Studio",
    licenseMode: "seat",
  },
  "ai-companion-content-production": {
    displayName: "AI Companion: Content Production",
    category: "media",
    subscriptionTier: "Studio",
    licenseMode: "seat",
  },
  "ai-companion-sales-agent-handoff": {
    displayName: "AI Companion: Sales Agent Hand-off",
    category: "automation",
    subscriptionTier: "Studio",
    licenseMode: "seat",
  },
  "ai-companion-command-routing": {
    displayName: "AI Companion: Multi-App Command Routing",
    category: "command",
    subscriptionTier: "Enterprise",
    licenseMode: "seat",
  },
  "ai-companion-workspace-access": {
    displayName: "AI Companion: Unified Workspace Access",
    category: "command",
    subscriptionTier: "Enterprise",
    licenseMode: "seat",
  },
  "think-for-me-mode": {
    displayName: "Think For Me Mode",
    category: "command",
    subscriptionTier: "Studio",
    licenseMode: "seat",
  },
  youtube_ops_vercel: {
    displayName: "YouTube Ops",
    category: "automation",
    subscriptionTier: "Studio",
    licenseMode: "subscription",
  },
  "viral-stitch-ai": {
    displayName: "Viral Stitch AI",
    category: "media",
    subscriptionTier: "Studio",
    licenseMode: "subscription",
  },
  "barz-web-studio": {
    displayName: "Barz Web Studio",
    category: "media",
    subscriptionTier: "Studio",
    licenseMode: "subscription",
  },
  "lyric-video-forge": {
    displayName: "Lyric Video Forge",
    category: "media",
    subscriptionTier: "Studio",
    licenseMode: "seat",
  },
  "dj-curse-reverse": {
    displayName: "DJ Curse Reverse",
    category: "media",
    subscriptionTier: "Core",
    licenseMode: "subscription",
  },
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProductId(value: string) {
  return slugify(value || "illco-app");
}

function toDisplayName(value: string) {
  return value
    .replace(/^illcoai-/, "ILLCO AI ")
    .replace(/^illco-/, "ILLCO ")
    .replace(/[_-]+/g, " ")
    .replace(/\b(ai|api|seo|uap|hq|e2b|ltb|sbl)\b/gi, (part) => part.toUpperCase())
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function categoryFor(name: string): ProductCategory {
  const value = name.toLowerCase();
  if (/(api|backend|webhook|gateway|connector|reporter)/.test(value)) return "backend";
  if (/(video|sora|voice|music|lyric|rap|song|radio|lipsync|mastering|slideshow|serato|visual)/.test(value)) {
    return "media";
  }
  if (/(store|commerce|payments|funnel|agency|tshirt|shop|petition)/.test(value)) return "commerce";
  if (/(real-estate|realtor|airbnb|gardening|pools)/.test(value)) return "realEstate";
  if (/(bot|ops|codex|flow|workspace|workstation|tools|nexus|automate|godmode|lab|hq)/.test(value)) {
    return "automation";
  }
  if (/(command|license)/.test(value)) return "command";
  return "experimental";
}

function categoryForRegistryApp(app: IllcoRegistryEntry): ProductCategory {
  const type = String(app.type || "").toLowerCase();
  if (type === "creative" || type === "music") return "media";
  if (type === "growth") return "commerce";
  if (type === "ops") return "command";
  return categoryFor(`${app.id || ""} ${app.name || ""} ${app.notes || ""}`);
}

function tierFor(category: ProductCategory, name: string): ProductRecord["subscriptionTier"] {
  if (/(enterprise|platform|hq|workstation|mastering|command)/i.test(name)) return "Enterprise";
  if (category === "media" || category === "automation") return "Studio";
  if (category === "backend" || category === "commerce") return "Pro";
  return "Core";
}

function licenseModeFor(category: ProductCategory, name: string): ProductRecord["licenseMode"] {
  if (/(api|backend|webhook|gateway)/i.test(name)) return "usage";
  if (/(hq|ops|command|internal|reporter)/i.test(name)) return "internal";
  if (category === "commerce") return "subscription";
  return "seat";
}

function publicUrl(value: string | null | undefined) {
  const url = String(value || "").trim();
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname.toLowerCase())) return null;
  } catch {
    return null;
  }
  return url;
}

const registrySnapshot = appRegistrySnapshot as IllcoRegistrySnapshot;
export const illcoCommandRegistryUpdatedAt = registrySnapshot.updatedAt || deploymentSnapshotTakenAt;

const deploymentProducts = deploymentProjects.map((project) => {
  const override = productOverridesByName[project.name] || null;
  const category = override?.category || categoryFor(project.name);
  return {
    ...project,
    id: slugify(project.name || "project"),
    displayName: override?.displayName || toDisplayName(project.name),
    category,
    subscriptionTier: override?.subscriptionTier || tierFor(category, project.name),
    licenseMode: override?.licenseMode || licenseModeFor(category, project.name),
    isLive: Boolean(project.productionUrl),
    registrySource: "deployment-snapshot",
  };
}) satisfies ProductRecord[];

function registryProductFromApp(app: IllcoRegistryEntry): ProductRecord | null {
  const rawId = String(app.id || app.name || "").trim();
  const displayName = String(app.name || app.id || "").trim();
  const id = normalizeProductId(rawId || displayName);
  if (!id || !displayName) return null;

  const category = categoryForRegistryApp(app);
  const liveUrl = publicUrl(app.liveUrl);
  const stage = String(app.stage || "Registry").trim();

  return {
    name: rawId || id,
    productionUrl: liveUrl,
    updated: stage,
    nodeVersion: "22.x",
    id,
    displayName,
    category,
    subscriptionTier: tierFor(category, `${displayName} ${stage}`),
    licenseMode: licenseModeFor(category, `${displayName} ${app.type || ""}`),
    isLive: Boolean(liveUrl && /production|live|verified|public/i.test(`${stage} ${app.saleStatus || ""}`)),
    registrySource: "illco-command-registry",
    description: String(app.notes || "").trim() || undefined,
    imageUrl: String(app.imageUrl || "").trim() || undefined,
    liveUrl: liveUrl || undefined,
    paymentUrl: publicUrl(app.paymentUrl) || undefined,
    loginUrl: publicUrl(app.loginUrl) || undefined,
    primaryCta: String(app.primaryCta || "").trim() || undefined,
    stage,
    saleStatus: String(app.saleStatus || "").trim() || undefined,
    owner: String(app.owner || "").trim() || undefined,
    checkoutOfferId: String(app.checkoutOfferId || "").trim() || undefined,
    accessModel: String(app.accessModel || "").trim() || undefined,
    fulfillmentPath: String(app.fulfillmentPath || "").trim() || undefined,
    priceCents: typeof app.priceCents === "number" ? app.priceCents : undefined,
    displayed: app.displayed,
    ssoConnected: Boolean(app.ssoConnected),
    requiresLogin: Boolean(app.requiresLogin),
    demoUrl: publicUrl(app.demoUrl) || undefined,
    demoEmbedUrl: publicUrl(app.demoEmbedUrl) || undefined,
  };
}

const mergedProductsById = new Map<string, ProductRecord>();

for (const product of deploymentProducts) {
  mergedProductsById.set(product.id, product);
}

const registrySaleFields = new Set<keyof ProductRecord>([
  "accessModel",
  "checkoutOfferId",
  "demoEmbedUrl",
  "demoUrl",
  "description",
  "displayed",
  "fulfillmentPath",
  "imageUrl",
  "isLive",
  "liveUrl",
  "loginUrl",
  "owner",
  "paymentUrl",
  "priceCents",
  "primaryCta",
  "productionUrl",
  "requiresLogin",
  "saleStatus",
  "ssoConnected",
  "stage",
  "updated",
]);

function mergeRegistryProduct(current: ProductRecord, registryProduct: ProductRecord) {
  const merged: ProductRecord = { ...current, registrySource: "illco-command-registry" };

  for (const [key, value] of Object.entries(registryProduct) as Array<[keyof ProductRecord, ProductRecord[keyof ProductRecord]]>) {
    if (registrySaleFields.has(key) && value !== undefined && value !== null) {
      (merged as Record<keyof ProductRecord, ProductRecord[keyof ProductRecord]>)[key] = value;
    }
  }

  return merged;
}

for (const app of registrySnapshot.apps || []) {
  const registryProduct = registryProductFromApp(app);
  if (!registryProduct) continue;

  const current = mergedProductsById.get(registryProduct.id);
  mergedProductsById.set(registryProduct.id, current ? mergeRegistryProduct(current, registryProduct) : registryProduct);
}

export const products = [...mergedProductsById.values()].sort((left, right) => {
  const liveRank = Number(right.isLive) - Number(left.isLive);
  return liveRank || left.displayName.localeCompare(right.displayName);
}) satisfies ProductRecord[];

export const featuredProductIds = [
  "ai-companions-recovered",
  "viral-stitch-ai",
  "youtube-ops-vercel",
  "sora-vault-cloud",
  "mastering-studio-platform",
  "dj-curse-reverse",
  "visual-voice-board",
  "uap-ai-lab",
  "illcoflow",
  "illcoappiverse",
  "license-validation-api",
];

export function getProductById(productId: string) {
  return products.find((product) => product.id === productId) || null;
}
