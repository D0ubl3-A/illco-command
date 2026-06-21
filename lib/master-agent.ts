import { categoryLabels, customerProductName, getAppFunnelState, planNames } from "@/lib/app-funnel";
import { checkoutProductCategoryDetails, checkoutProducts } from "@/lib/checkout-products";
import { getProofState } from "@/lib/demo-videos";
import { products, type ProductCategory, type ProductRecord } from "@/lib/deployments";
import { getConfigurationStatus } from "@/lib/env";
import { getMonetizationPlan } from "@/lib/monetization";
import { getProductViralImagePath } from "@/lib/product-marketing";
import { getProductLandingHref } from "@/lib/product-routes";

export type MasterAgentMode = "route" | "sell" | "support" | "build" | "admin";

export type MasterAgentRequest = {
  message: string;
  mode?: MasterAgentMode;
  limit?: number;
};

export type MasterAgentCatalogItem = {
  id: string;
  productId: string;
  offerId: string | null;
  name: string;
  category: string;
  appCategory: ProductCategory;
  summary: string;
  statusLabel: string;
  accessLabel: string;
  planLabel: string;
  proofLabel: string;
  detailsHref: string;
  requestHref: string;
  openHref: string | null;
  imagePath: string;
  canOpen: boolean;
  canCheckout: boolean;
  reason: string;
  score: number;
  evidence: string[];
};

export type MasterAgentResponse = {
  ok: true;
  mode: MasterAgentMode;
  summary: string;
  inventory: {
    apps: number;
    saleableOffers: number;
    catalogItems: number;
    openNow: number;
    setupAvailable: number;
    comingSoon: number;
    paymentsReady: boolean;
    googleOAuthReady: boolean;
  };
  actions: Array<{
    label: string;
    href: string;
    kind: "account" | "catalog" | "support" | "admin";
  }>;
  recommendations: MasterAgentCatalogItem[];
  nextSteps: string[];
  guardrails: string[];
};

type CatalogSourceItem = Omit<MasterAgentCatalogItem, "reason" | "score" | "evidence"> & {
  searchableText: string;
};

const intentKeywords: Record<MasterAgentMode, string[]> = {
  route: ["route", "find", "open", "product", "tool", "app", "where", "which"],
  sell: ["sale", "sales", "lead", "leads", "gmail", "linkedin", "reply", "proposal", "client", "customer", "checkout", "ads"],
  support: ["login", "oauth", "google", "account", "subscription", "profile", "billing", "unlock", "access", "password"],
  build: ["build", "custom", "agent", "workflow", "automation", "notion", "api", "webhook", "android", "app"],
  admin: ["admin", "repair", "watcher", "deploy", "vercel", "github", "health", "smoke", "config"],
};

const categoryBoosts: Record<ProductCategory, string[]> = {
  command: ["command", "operator", "agent", "decision", "think", "dashboard", "admin"],
  media: ["video", "music", "song", "lyric", "rap", "sora", "youtube", "visual", "master", "clip", "motion"],
  automation: ["lead", "gmail", "linkedin", "reply", "proposal", "notion", "workflow", "automation", "crm", "text"],
  commerce: ["store", "shop", "checkout", "stripe", "payment", "sell", "shirt", "commerce", "order"],
  realEstate: ["real", "estate", "listing", "realtor", "airbnb", "property", "tour"],
  backend: ["api", "backend", "webhook", "database", "connector", "health", "deploy", "integration"],
  experimental: ["lab", "test", "prototype", "experimental", "research"],
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function detectMode(message: string, requestedMode?: MasterAgentMode): MasterAgentMode {
  if (requestedMode) return requestedMode;
  const tokens = new Set(tokenize(message));
  let bestMode: MasterAgentMode = "route";
  let bestScore = 0;

  for (const [mode, keywords] of Object.entries(intentKeywords) as Array<[MasterAgentMode, string[]]>) {
    const score = keywords.reduce((total, keyword) => total + (tokens.has(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestMode = mode;
      bestScore = score;
    }
  }

  return bestMode;
}

function sourceCatalogItems(): CatalogSourceItem[] {
  const offerProductIds = new Set(checkoutProducts.map((offer) => offer.appProductId));
  const offerItems = checkoutProducts
    .map((offer) => {
      const product = products.find((candidate) => candidate.id === offer.appProductId);
      return product ? buildCatalogSourceItem(product, offer) : null;
    })
    .filter((item): item is CatalogSourceItem => Boolean(item));
  const appItems = products
    .filter((product) => !offerProductIds.has(product.id))
    .map((product) => buildCatalogSourceItem(product, null));

  return [...offerItems, ...appItems];
}

function buildCatalogSourceItem(
  product: ProductRecord,
  offer: (typeof checkoutProducts)[number] | null,
): CatalogSourceItem {
  const state = getAppFunnelState(product);
  const proof = getProofState(product.id);
  const plan = getMonetizationPlan(product.id);
  const name = offer?.name || customerProductName(product);
  const category = offer?.category || categoryLabels[product.category];
  const detailsHref = getProductLandingHref(product.id);
  const summary = offer?.summary || state.summary;
  const planLabel = plan ? planNames[plan.funnelPlanId] : planNames[state.planId];
  const openHref = state.canOpen ? state.safeUrl : null;
  const imagePath = getProductViralImagePath(product);
  const offerCategoryDetail = offer ? checkoutProductCategoryDetails[offer.category] : "";
  const searchableText = normalizeText(
    [
      offer?.id,
      offer?.name,
      offer?.category,
      offer?.summary,
      product.id,
      product.name,
      product.displayName,
      product.productionUrl,
      categoryLabels[product.category],
      state.title,
      state.summary,
      state.statusLabel,
      state.accessLabel,
      proof.label,
      plan?.healthGate.reason,
      plan?.healthGate.behavior,
      offerCategoryDetail,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return {
    id: offer?.id || product.id,
    productId: product.id,
    offerId: offer?.id || null,
    name,
    category,
    appCategory: product.category,
    summary,
    statusLabel: state.statusLabel,
    accessLabel: state.accessLabel,
    planLabel,
    proofLabel: state.proofLabel,
    detailsHref,
    requestHref: `${detailsHref}#request`,
    openHref,
    imagePath,
    canOpen: state.canOpen,
    canCheckout: state.canCheckout,
    searchableText,
  };
}

function scoreItem(item: CatalogSourceItem, tokens: string[], mode: MasterAgentMode) {
  let score = 0;
  const evidence: string[] = [];

  for (const token of tokens) {
    if (!item.searchableText.includes(token)) continue;
    const exactWord = new RegExp(`\\b${escapeRegExp(token)}\\b`).test(item.searchableText);
    score += exactWord ? 5 : 3;
    if (evidence.length < 3) evidence.push(`Matched "${token}"`);
  }

  const modeTerms = intentKeywords[mode] || [];
  for (const term of modeTerms) {
    if (item.searchableText.includes(term)) score += 2;
  }

  for (const term of categoryBoosts[item.appCategory]) {
    if (tokens.includes(term)) score += 4;
  }

  if (mode === "sell" && item.category === "Sales & Lead Recovery") score += 9;
  if (mode === "support" && ["think-for-me-mode", "ai-companions-recovered"].includes(item.productId)) score += 4;
  if (mode === "admin" && /admin|ops|command|watcher|reporter|backend/.test(item.searchableText)) score += 6;
  if (item.canCheckout) score += 4;
  if (item.canOpen) score += 2;
  if (/proof ready|tutorial ready|working/i.test(item.statusLabel)) score += 2;

  if (!evidence.length) {
    evidence.push(item.canCheckout ? "Ready route with checkout gate active" : `${item.statusLabel} route in catalog`);
  }

  return { score, evidence };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function actionSet(mode: MasterAgentMode) {
  const actions: MasterAgentResponse["actions"] = [
    { label: "Account and subscriptions", href: "/account", kind: "account" },
    { label: "All apps", href: "/commander#apps", kind: "catalog" },
    { label: "ILLCO tools", href: "/tools", kind: "catalog" },
    { label: "Request setup", href: "/#request", kind: "support" },
  ];
  if (mode === "admin") {
    actions.push({ label: "Admin watcher", href: "/admin#watcher", kind: "admin" });
  }
  return actions;
}

function nextStepsFor(mode: MasterAgentMode, recommendations: MasterAgentCatalogItem[]) {
  const first = recommendations[0];
  const productName = first?.name || "the best matching product";
  if (mode === "support") {
    return [
      "Open Account and sign in with the purchaser email.",
      "Check Saved access for subscriptions and launch links.",
      "If Google sign-in fails, retry after clearing old cookies and confirm the configured redirect URI in Google Cloud.",
    ];
  }
  if (mode === "sell") {
    return [
      `Send traffic to ${productName} only after the route, proof, checkout, and confirmation path pass.`,
      "Use Details for setup products and Unlock only for products with active checkout gates.",
      "Capture the request if payment is not ready so the lead does not leave the app.",
    ];
  }
  if (mode === "admin") {
    return [
      "Open the admin watcher for repair requests and route failures.",
      "Run smoke tests before promoting a payment link.",
      "Keep locked products inside their app landing page until checkout and proof gates pass.",
    ];
  }
  return [
    `Start with ${productName}.`,
    "Use Open only when the card says it is available.",
    "Use Request Setup when the module is marked setup or coming soon.",
  ];
}

function reasonFor(item: CatalogSourceItem, mode: MasterAgentMode) {
  if (item.canCheckout) return "Best match with checkout and access gates active.";
  if (item.canOpen) return "Best match with a safe open route.";
  if (mode === "support") return "Relevant account or access route; no product bypass is exposed.";
  if (item.offerId) return "Best matching sales offer; setup stays inside the app landing page.";
  return "Best matching app route; request setup is the safe action.";
}

export function runMasterAgent(input: MasterAgentRequest): MasterAgentResponse {
  const message = input.message.trim();
  const mode = detectMode(message, input.mode);
  const tokens = tokenize(message);
  const limit = Math.min(12, Math.max(3, input.limit || 6));
  const config = getConfigurationStatus();
  const items = sourceCatalogItems();
  const scored = items
    .map((item) => {
      const { score, evidence } = scoreItem(item, tokens, mode);
      return {
        ...item,
        reason: reasonFor(item, mode),
        score,
        evidence,
      };
    })
    .sort((a, b) => b.score - a.score || Number(b.canCheckout) - Number(a.canCheckout) || a.name.localeCompare(b.name))
    .slice(0, limit);

  const openNow = items.filter((item) => item.canOpen).length;
  const setupAvailable = items.filter((item) => /setup/i.test(item.statusLabel)).length;
  const comingSoon = items.filter((item) => /coming soon/i.test(item.statusLabel)).length;
  const topName = scored[0]?.name || "the catalog";

  return {
    ok: true,
    mode,
    summary: `Master Agent matched "${message || "catalog request"}" to ${topName} and kept locked products on safe in-app routes.`,
    inventory: {
      apps: products.length,
      saleableOffers: checkoutProducts.length,
      catalogItems: items.length,
      openNow,
      setupAvailable,
      comingSoon,
      paymentsReady: config.subscriptionsReady,
      googleOAuthReady: config.googleOAuthReady,
    },
    actions: actionSet(mode),
    recommendations: scored,
    nextSteps: nextStepsFor(mode, scored),
    guardrails: [
      "No external app launch is returned unless the product access gate says it can open.",
      "Checkout actions stay tied to configured subscription and product gates.",
      "Admin routes remain separate from standard user account routes.",
    ],
  };
}
