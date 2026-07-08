"use client";

import { startTransition, type FormEvent, type ReactNode, useDeferredValue, useMemo, useState } from "react";

import { demoVideos, getPreferredShowcaseVideo, getProofState, getTutorialVideo } from "@/lib/demo-videos";
import { deploymentSnapshotTakenAt, type ProductRecord } from "@/lib/deployments";
import { customerProductName } from "@/lib/app-funnel";
import { getMonetizationPlan, monetizationPlan, type MonetizationPlanEntry } from "@/lib/monetization";
import { getProductNotice } from "@/lib/product-notices";
import { getProductViralImagePath } from "@/lib/product-marketing";
import { getProductLandingHref, getProductModuleHref, isPublicProductLaunchHref } from "@/lib/product-routes";
import {
  getGithubProofLinks,
  projectCompletionGeneratedAt,
  projectCompletionOwners,
  projectCompletionOwnersText,
  projectCompletionSummary,
  sourceStatusLabel,
} from "@/lib/project-completion";
import { canDirectCheckoutPublicProduct } from "@/lib/public-checkout";

type PlanId = "core" | "studio" | "suite" | "agency" | "enterprise";
type ReadinessTone = "ready" | "pending" | "blocked" | "neutral";
type CustomerStatus = "working" | "tutorial" | "setup" | "soon";
type ProofState = ReturnType<typeof getProofState>;
type ShowcaseVideo = NonNullable<ReturnType<typeof getPreferredShowcaseVideo>>;

type FunnelConfig = {
  subscriptionsReady: boolean;
  leadCaptureReady: boolean;
  licenseIssuingReady?: boolean;
  customerPortalReady?: boolean;
  stripeWebhooksReady?: boolean;
  stripeMode?: "live" | "test" | "missing";
  freeTrialDays?: number | null;
  freeTrialDaysByPlan?: Record<PlanId, number | null>;
  planPrices: Record<PlanId, boolean>;
};

type Props = {
  products: ProductRecord[];
  featuredProductIds: string[];
  config: FunnelConfig;
  checkoutProductsSlot?: ReactNode;
};

type ServiceOffer = {
  id: string;
  name: string;
  price: string;
  fit: string;
  bestFor: string;
  turnaround: string;
  outcomes: string[];
};

const categoryLabels: Record<ProductRecord["category"], string> = {
  command: "Command",
  media: "Media",
  automation: "Automation",
  commerce: "Commerce",
  realEstate: "Real Estate",
  backend: "Backend",
  experimental: "Experimental",
};

const categoryOrder: ProductRecord["category"][] = [
  "command",
  "automation",
  "media",
  "commerce",
  "realEstate",
  "backend",
  "experimental",
];

const categoryDescriptions: Record<ProductRecord["category"], string> = {
  command: "Proven decision systems that turn uncertain requests into repeatable execution plans.",
  automation: "Lead handling, workflow routing, bots, ops assistants, and productivity systems.",
  media: "Music, video, voice, lyrics, mastering, creator tools, and publishing workflows.",
  commerce: "Funnels, payments, stores, merch, product sales, and conversion assets.",
  realEstate: "Property, local service, Realtor, Airbnb, and field-ops workflows.",
  backend: "APIs, gateways, webhooks, reporting layers, and infrastructure services.",
  experimental: "Labs, prototypes, research apps, and products still being shaped.",
};

const planNames: Record<PlanId, string> = {
  core: "Core",
  studio: "Studio",
  suite: "Suite",
  agency: "Agency",
  enterprise: "Enterprise",
};

const productProcessById: Record<string, string[]> = {
  "think-for-me-mode": [
    "Define the objective and the measurable outcome you are trying to hit.",
    "Gather context, files, constraints, and any hard boundaries.",
    "Run the Command Operator prompt to create a prioritized action plan.",
    "Review and refine the output against your team rules and brand standards.",
    "Assign actions and ownership to the next best decision.",
    "Execute the plan, then record what worked and what should be reused.",
  ],
  "ai-companion-conversational-intake": [
    "Capture the user context and source lane.",
    "Normalize the request into an internal ticket format.",
    "Route the ticket to the right workflow in one pass.",
    "Keep follow-up notes and proof in one dashboard.",
    "Escalate only when confidence is low or risk is high.",
  ],
  "ai-companion-prompt-studio": [
    "Draft the campaign or task brief.",
    "Apply approved prompt structure and constraints.",
    "Generate first-pass output with versioning.",
    "Review against examples and brand guardrails.",
    "Ship the chosen draft to the right workspace.",
  ],
  "ai-companion-content-production": [
    "Choose topic, keyword intent, and asset format.",
    "Generate source brief and production schedule.",
    "Create draft, caption, and distribution variants.",
    "Run quality checks before publishing.",
    "Track conversion and move to the next piece.",
  ],
  "ai-companion-sales-agent-handoff": [
    "Collect inbound lead details and source.",
    "Assign service category and ownership.",
    "Draft response with confidence boundaries.",
    "Escalate edge cases to a human review step.",
    "Close each lead in a tracked follow-up lane.",
  ],
  "ai-companion-command-routing": [
    "Unify user requests across products and services.",
    "Map each request to the right tool or service path.",
    "Apply gating rules before execution.",
    "Track completion, blockers, and reopen triggers.",
    "Report back with the next best action.",
  ],
};

const productProcessByCategory: Record<ProductRecord["category"], string[]> = {
  command: [
    "Define the business objective and expected outcome.",
    "Gather all relevant context, constraints, and source inputs.",
    "Run the Command Operator prompt to generate a clear execution plan.",
    "Review and refine the output against your real rules and safety constraints.",
    "Assign owners, priorities, and timelines to each next action.",
    "Execute, then capture lessons in the same workflow for reuse.",
  ],
  media: [
    "Collect source assets, style notes, and output requirement.",
    "Generate or edit content with version checkpoints.",
    "Review visual/audio quality and brand consistency.",
    "Export and package final assets with metadata.",
    "Publish or handoff with source and delivery notes.",
  ],
  automation: [
    "Map the trigger, input, and expected output.",
    "Define ownership, approval, and failure states.",
    "Connect channels, tools, and status tracking.",
    "Run the first repeatable loop and verify results.",
    "Improve rules and reduce manual intervention.",
  ],
  commerce: [
    "Define product, offer, and customer entry path.",
    "Validate pricing, taxes, and checkout requirements.",
    "Run a test flow end-to-end with proof logging.",
    "Automate confirmation and receipt routing.",
    "Track conversion and retention metrics.",
  ],
  realEstate: [
    "Collect property info and lead source.",
    "Assign lead to workflow status and owner.",
    "Coordinate tours, media, and document handoff.",
    "Confirm communication cadence and updates.",
    "Track outcomes through close or recycle loop.",
  ],
  backend: [
    "Create reliable endpoint contracts and expected payloads.",
    "Add authentication, validation, and fallback behavior.",
    "Publish interfaces for downstream services.",
    "Monitor logs for latency and failures.",
    "Iterate against load and observed edge cases.",
  ],
  experimental: [
    "Document the intended behavior and risks.",
    "Build a minimal viable workflow before polish.",
    "Capture manual overrides and known limitations.",
    "Run acceptance checks with real traffic where possible.",
    "Improve and harden only after baseline passes.",
  ],
};

const plans: Array<{
  id: PlanId;
  name: string;
  price: string;
  fit: string;
  access: string[];
  primaryAction: "checkout" | "request";
}> = [
  {
    id: "core",
    name: "Core",
    price: "$9/mo",
    fit: "Low-cost starter access for one working product path.",
    access: ["Account hub access", "Working tool proof", "Proof video library"],
    primaryAction: "checkout",
  },
  {
    id: "studio",
    name: "Studio",
    price: "$19/mo",
    fit: "Creator and media tools bundled at a lightweight monthly rate.",
    access: ["Public media apps", "Proof-ready tools", "Subscription access"],
    primaryAction: "checkout",
  },
  {
    id: "suite",
    name: "Suite",
    price: "$29/mo",
    fit: "Cross-app suite access for teams that want one unified workspace.",
    access: ["Multi-app access bundle", "Companions workspace access", "Suite onboarding path"],
    primaryAction: "checkout",
  },
  {
    id: "agency",
    name: "Agency",
    price: "$49/mo",
    fit: "Multi-client operations, funnels, and commerce workflows.",
    access: ["Agency app bundle", "Working route directory", "Setup support"],
    primaryAction: "checkout",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    fit: "Custom setup across the full ILLCO product suite.",
    access: ["Custom bundle", "Migration support", "Priority onboarding"],
    primaryAction: "request",
  },
];

const serviceOffers: ServiceOffer[] = [
  {
    id: "credit-recharge",
    name: "Credit Recharge",
    price: "from $25",
    fit: "Add usage credits for generation, exports, automations, or assisted runs without changing your whole plan.",
    bestFor: "Customers who already have a tool path and need more usage capacity.",
    turnaround: "Same-account recharge",
    outcomes: ["Credit top-up", "Usage support", "Account-linked recharge path"],
  },
  {
    id: "automation-audit-roadmap",
    name: "Automation Audit + 30-Day Roadmap",
    price: "$100",
    fit: "A focused review of the workflows slowing down your business, followed by a practical automation roadmap.",
    bestFor: "Founders who know work is leaking time but need the cleanest first move.",
    turnaround: "Roadmap sprint",
    outcomes: ["Workflow audit", "30-day action plan", "Highest-leverage automation targets"],
  },
  {
    id: "single-ai-agent",
    name: "Done-For-You AI Agent",
    price: "from $500",
    fit: "A custom specialist agent built around one job, process, inbox, content lane, or operational workflow.",
    bestFor: "A single repeatable task that needs an expert helper, not another tool to manage.",
    turnaround: "Single-agent build",
    outcomes: ["Single-agent build", "Prompt and tool design", "Launch handoff"],
  },
  {
    id: "ai-ops-stack",
    name: "AI Ops Stack",
    price: "from $1,000",
    fit: "A 5-agent operating system for teams that need coordinated research, production, QA, support, or sales workflows.",
    bestFor: "Teams ready to split work across specialist agents with a shared operating rhythm.",
    turnaround: "Multi-agent system",
    outcomes: ["5-agent system", "Role prompts and handoffs", "Operating rhythm"],
  },
  {
    id: "notion-ops-system",
    name: "Notion Operations System",
    price: "from $800",
    fit: "A Notion teamspace with SOPs, dashboards, databases, and workflow structure your team can actually use.",
    bestFor: "Teams whose processes live in heads, chats, and scattered docs.",
    turnaround: "Workspace buildout",
    outcomes: ["Teamspace build", "SOP library", "Tracking dashboards"],
  },
  {
    id: "ai-content-production",
    name: "AI Content Production",
    price: "from $800",
    fit: "Video and story production packages that turn ideas into repeatable, AI-assisted publishing workflows with captions, highlights, narration, and measured pacing.",
    bestFor: "Creators and small businesses that need a reliable content engine instead of one-off posts.",
    turnaround: "Production package",
    outcomes: ["Story package", "Slow tutorial workflow", "Reusable publishing system"],
  },
];

const customServiceOffer: ServiceOffer = {
  id: "enterprise",
  name: "Custom app access or enterprise setup",
  price: "custom",
  fit: "A custom bundle for teams that need app access, guided onboarding, or a broader operational build.",
  bestFor: "Businesses with multiple moving pieces that need the path scoped before pricing.",
  turnaround: "Scoped setup",
  outcomes: ["Custom bundle", "Guided onboarding", "Priority setup path"],
};

const musicVideoTestimonials = [
  {
    quote: "The video finally made the song feel finished. It hit the beat, looked expensive, and gave me something I could post without explaining the concept first.",
    source: "Independent artist feedback",
    result: "Beat-synced visual package",
  },
  {
    quote: "I sent the track and got back a visual direction that matched the mood instead of generic AI clips. The lyric moments and motion made the hook feel bigger.",
    source: "Music video client feedback",
    result: "Lyric-forward short edits",
  },
  {
    quote: "This saved me from booking a full shoot just to test the record. I had a clean visual, promo cuts, and a direction for the next release cycle.",
    source: "Creator launch feedback",
    result: "Release-ready promo assets",
  },
];

const creditModelPlans = [
  { name: "Starter", price: "$15/mo", credits: "500 credits", fit: "Occasional creators testing one tool or one small content lane." },
  { name: "Pro", price: "$45/mo", credits: "2,000 credits", fit: "Creators using media, clipping, storyboards, and music workflows each month." },
  { name: "Business", price: "$99/mo", credits: "5,000 credits", fit: "Teams that need a shared pool, commercial usage, and priority setup." },
  { name: "Enterprise", price: "Custom", credits: "Dedicated pool", fit: "High-volume Sora-quality video, white-label workflows, and SLA-backed delivery." },
];

const creditUsageExamples = [
  "Audio analysis: 5 credits per 30-second segment",
  "Media clipping: 2 credits per short clip",
  "Storyboard generation: 50 credits per scene pack",
  "Book generation: 80 credits per chapter",
  "Premium video generation: quoted by model, length, and review level",
];


export function CommandClient({ products, featuredProductIds, config, checkoutProductsSlot }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductRecord["category"] | "all">("all");
  const [leadResult, setLeadResult] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState(serviceOffers[0].id);
  const [showAllApps, setShowAllApps] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const githubProofLinks = useMemo(() => getGithubProofLinks(8), []);
  const githubProofSnapshotLabel = formatSnapshotLabel(projectCompletionGeneratedAt);
  const githubProofOwnersLabel = projectCompletionOwnersText();

  const productOffers = products
    .map((product) => ({ product, plan: getMonetizationPlan(product.id) }))
    .filter((offer): offer is { product: ProductRecord; plan: MonetizationPlanEntry } => Boolean(offer.plan));

  const youtubeOpsProduct = products.find((product) => product.id === "youtube-ops-vercel") || null;
  const youtubeOpsState = youtubeOpsProduct ? getCustomerProductState(youtubeOpsProduct, config) : null;
  const youtubeOpsProof = getProofState("youtube-ops-vercel");
  const youtubeOpsPlan = getMonetizationPlan("youtube-ops-vercel");
  const youtubeOpsCheckoutReady = Boolean(youtubeOpsState?.canCheckout);
  const youtubeOpsAvailability = customerAvailabilityNote(youtubeOpsPlan);
  const youtubeOpsProofStatus = customerProofLabel(youtubeOpsProof);
  const youtubeOpsProofNote = customerProofSummary(youtubeOpsProof);

  const publicOffers = productOffers.filter(({ plan }) => plan.publicInFunnel);
  const workingOffers = publicOffers.filter(({ product }) => canDirectCheckoutPublicProduct(product.id));
  const setupOffers = publicOffers.filter(
    ({ product, plan }) => plan.healthGate.behavior === "allow-checkout-with-warning" || (plan.healthGate.behavior === "allow-checkout" && !canDirectCheckoutPublicProduct(product.id)),
  );
  const comingSoonCount = publicOffers.filter(({ plan }) => plan.healthGate.behavior === "block-checkout").length;
  const guidedSetupCount = productOffers.filter(({ plan }) => isGuidedSetupBehavior(plan.healthGate.behavior)).length;
  const demoReadyOffers = publicOffers.filter(({ product }) => Boolean(getTutorialVideo(product.id)));
  const proofReadyOffers = publicOffers.filter(({ product }) => getProofState(product.id).ready);
  const resultProofReadyCount = publicOffers.filter(({ product }) => getProofState(product.id).primaryVideo?.mode === "result-proof").length;
  const tutorialReadyCount = publicOffers.filter(({ product }) => getProofState(product.id).primaryVideo?.mode === "full-walkthrough").length;
  const demoCount = demoReadyOffers.length;
  const checkoutPlans = plans.filter((plan) => plan.primaryAction === "checkout");
  const configuredPlanCount = checkoutPlans.filter((plan) => config.planPrices[plan.id]).length;
  const paymentConfigValue = configuredPlanCount
    ? config.subscriptionsReady
      ? `${configuredPlanCount}/${checkoutPlans.length}${config.stripeMode === "test" ? " test" : ""}`
      : `Key missing ${configuredPlanCount}/${checkoutPlans.length}`
    : "Missing";
  const paymentConfigTone = configuredPlanCount && config.subscriptionsReady && config.stripeMode !== "test" ? "good" : "warn";
  const planHasWorkingProducts = (planId: PlanId) =>
    workingOffers.some((offer) => offer.plan.funnelPlanId === planId || (planId === "suite" && offer.plan.funnelPlanId === "agency"));
  const checkoutPlanAvailable = plans.some(
    (plan) =>
      plan.primaryAction === "checkout" &&
      config.subscriptionsReady &&
      config.planPrices[plan.id] &&
      planHasWorkingProducts(plan.id),
  );
  const snapshotLabel = formatSnapshotLabel(deploymentSnapshotTakenAt);
  const demoSnapshotLabel = formatSnapshotLabel(demoVideos.generatedAt);
  const isReadyProduct = (product: ProductRecord) => {
    const state = getCustomerProductState(product, config);
    return state.customerStatus === "working" || state.customerStatus === "tutorial";
  };
  const heroProofCandidates = uniqueProductsById(
    [
      "mastering-studio-platform",
      "youtube-ops-vercel",
      "uap-ai-lab",
      "sora-vault-cloud",
      "video-margin-ai",
    ]
      .map((id) => products.find((product) => product.id === id) || null)
      .filter(Boolean)
      .concat(proofReadyOffers.map(({ product }) => product)),
  );
  const readyHeroProofProducts = heroProofCandidates.filter(isReadyProduct);
  const heroProofProducts = uniqueProductsById([...readyHeroProofProducts, ...heroProofCandidates.filter((product) => !isReadyProduct(product))]).slice(
    0,
    3,
  );
  const [activeProofProductId, setActiveProofProductId] = useState(heroProofProducts[0]?.id || "");
  const activeProofProduct =
    heroProofProducts.find((product) => product.id === activeProofProductId) || heroProofProducts[0] || null;
  const activeProofState = activeProofProduct ? getProofState(activeProofProduct.id) : null;
  const activeProofVideo = activeProofState?.primaryVideo || null;
  const activeProofCustomerState = activeProofProduct ? getCustomerProductState(activeProofProduct, config) : null;
  const appMenuProducts = useMemo(
    () =>
      [...products].sort((left, right) => {
        const leftState = getCustomerProductState(left, config);
        const rightState = getCustomerProductState(right, config);
        const statusRank: Record<CustomerStatus, number> = { tutorial: 0, working: 1, setup: 2, soon: 3 };
        return statusRank[leftState.customerStatus] - statusRank[rightState.customerStatus] || left.displayName.localeCompare(right.displayName);
      }),
    [config, products],
  );

  const featuredProducts = featuredProductIds
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean) as ProductRecord[];

  const headlineProducts = [
    ...workingOffers.map(({ product }) => product),
    ...featuredProducts.filter((product) => {
      const plan = getMonetizationPlan(product.id);
      return plan?.publicInFunnel && plan.healthGate.behavior === "allow-checkout-with-warning";
    }),
  ];

  const demoPanelProducts = [
    ...demoReadyOffers.map(({ product }) => product),
    ...publicOffers
      .map(({ product }) => product)
      .filter((product) => !demoReadyOffers.some((demoProduct) => demoProduct.product.id === product.id)),
  ].slice(0, 8);

  const filteredProducts = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    return products
      .filter((product) => {
        const matchesCategory = category === "all" || product.category === category;
        const matchesQuery =
          !normalized ||
          product.displayName.toLowerCase().includes(normalized) ||
          product.name.toLowerCase().includes(normalized) ||
          product.productionUrl?.toLowerCase().includes(normalized);
        return matchesCategory && matchesQuery;
      })
      .sort((left, right) => productDirectoryRank(left, config) - productDirectoryRank(right, config) || customerProductName(left).localeCompare(customerProductName(right)));
  }, [category, config, deferredQuery, products]);

  const visibleProducts = showAllApps ? filteredProducts : filteredProducts.slice(0, 6);
  const readyVisibleProducts = visibleProducts.filter(isReadyProduct);
  const comingSoonVisibleProducts = visibleProducts.filter((product) => !isReadyProduct(product));
  const readyProductGroups = categoryOrder
    .map((categoryId) => ({
      categoryId,
      products: readyVisibleProducts.filter((product) => product.category === categoryId),
      total: readyVisibleProducts.filter((product) => product.category === categoryId).length,
    }))
    .filter((group) => group.products.length > 0);
  const comingSoonProductGroups = categoryOrder
    .map((categoryId) => ({
      categoryId,
      products: comingSoonVisibleProducts.filter((product) => product.category === categoryId),
      total: comingSoonVisibleProducts.filter((product) => product.category === categoryId).length,
    }))
    .filter((group) => group.products.length > 0);
  const selectedService = serviceOffers.find((service) => service.id === selectedServiceId) || customServiceOffer;
  const trialDaysForPlan = (planId: PlanId) => config.freeTrialDaysByPlan?.[planId] ?? config.freeTrialDays ?? null;

  function selectService(serviceId: string) {
    setSelectedServiceId(serviceId);
    setLeadResult("");
  }

  function chooseService(serviceId: string) {
    selectService(serviceId);
    document.getElementById("request")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openAppLanding(productId: string) {
    if (!productId) return;
    window.location.assign(getProductModuleHref(productId));
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLeadResult("Sending request...");
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; detail?: string };
    setLeadResult(payload.ok ? "Request received. We will follow up with setup options." : safeLeadResult(payload.detail));
  }

  return (
    <div className="commandShell landingShell">
      <aside className="sideRail landingNav" aria-label="Landing navigation">
        <a className="brandBlock" href="#offer" aria-label="ILLCO AI home">
          <span className="brandGlyph">
            <img src="/brand/illco-command-logo.svg" alt="ILLCO AI logo" />
          </span>
          <strong>ILLCO AI</strong>
        </a>
        <nav className="railNav">
          <a href="#offer">Start</a>
          <a href="#checkout-products">Ready Tools</a>
          <a href="#services">Services</a>
          <a href="#demos">Demos</a>
          <a href="#proof">Proof</a>
          <a href="#apps">Browse Apps</a>
          <a href="/account">Account</a>
          <a href="#request">Request Help</a>
        </nav>
      </aside>

      <main id="main-content" className="workspace landingWorkspace">
        <section id="offer" className="posterHero" aria-label="ILLCO AI operating surface">
          <video
            className="posterHeroVideoBackdrop"
            src="/media/illco-command-header-loop-optimized.mp4"
            poster="/media/illco-command-header-loop-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
          <div className="posterHeroVideoShade" aria-hidden="true" />
          <video className="posterHeroFlyover" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
            <source src="/media/illco-flyover-cutout.webm" type="video/webm" />
            <source src="/media/illco-flyover-cutout-optimized.mp4" type="video/mp4" />
          </video>
        <header className="landingHeroToolbar">
          <div>
            <p className="heroEyebrow">AI tools that work now</p>
            <h1>Buy ready tools first, then build your custom stack.</h1>
            <p>Start with a working workflow, then unlock higher-complexity automation after proof and fit are confirmed.</p>
          </div>
          <div className="topActions">
            <a className="button primary" href="#checkout-products">
              Buy a ready tool
            </a>
            <a className="button secondary" href="#request">
              Request custom AI system
            </a>
          </div>
        </header>
          <div className="posterPanel posterCopy">
            <div className="posterHeading">
              <p className="heroEyebrow">One clear path</p>
              <h2>Turn ChatGPT into a command partner, not just a chatbot.</h2>
              <p className="posterLead">
                Choose a proven system for planning, decision support, and execution, or request a custom build when your process needs a dedicated operator stack.
              </p>
            </div>

            <div className="heroStatBand">
              <Fact label="Ready tools" value={String(workingOffers.length)} tone="good" />
              <Fact label="System proof" value={String(proofReadyOffers.length)} tone={proofReadyOffers.length ? "good" : "neutral"} />
              <Fact label="Service paths" value={String(serviceOffers.length)} tone="neutral" />
              <Fact label="Custom builds" value="Available" tone="good" />
            </div>

            <div className="heroActionRow">
              <a className="button primary" href="#checkout-products">
                Buy a ready tool
              </a>
              <a className="button secondary" href="#request">
                Request custom AI system
              </a>
            </div>

            <div className="heroLaneGrid" aria-label="ILLCO operating lanes">
              <div className="heroLane">
                <span>Buy</span>
                <strong>Start with a ready AI system.</strong>
                <p>Choose a proven tool with checkout and proof before you scale.</p>
              </div>
              <div className="heroLane">
                <span>Build</span>
                <strong>Get a custom AI operating system.</strong>
                <p>We build dedicated stacks when your process needs custom routing, approvals, and execution controls.</p>
              </div>
            </div>
          </div>

          <div className="posterPanel posterStage">
            <div className="proofStageFrame">
              <video
                className="heroHeaderVideo"
                src="/media/illco-command-header-loop-optimized.mp4"
                poster="/media/illco-command-header-loop-poster.jpg"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="ILLCO AI command preview video"
              />
              <video className="heroHeaderFlyover" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
                <source src="/media/illco-flyover-cutout.webm" type="video/webm" />
                <source src="/media/illco-flyover-cutout-optimized.mp4" type="video/mp4" />
              </video>
              <div className="heroHeaderVideoOverlay" aria-hidden="true">
                <span>{activeProofProduct ? customerProductName(activeProofProduct) : "ILLCO AI"}</span>
                <strong>{activeProofVideo ? videoActionLabel(activeProofVideo) : "Proof preview"}</strong>
              </div>
            </div>

            <div className="proofStageMeta">
              <div className="proofStageHeading">
                <p className="heroEyebrow">Featured proof</p>
                <h3>{activeProofProduct ? customerProductName(activeProofProduct) : "Featured proof"}</h3>
                <p>
                  {activeProofState
                    ? customerProofSummary(activeProofState)
                    : "Actual output proof appears here when available. Otherwise, request live proof before purchase."}
                </p>
              </div>

              <div className="proofStageSignals">
                {activeProofCustomerState ? (
                  <>
                    <Signal label="Plan" value={planNames[activeProofCustomerState.planId]} />
                    <Signal label="Access" value={activeProofCustomerState.accessLabel} />
                    <Signal label="Proof" value={activeProofState ? customerProofLabel(activeProofState) : "Proof coming"} />
                  </>
                ) : null}
              </div>

              <div className="proofStageActions">
                {activeProofProduct && activeProofCustomerState?.canCheckout ? (
                  <form action="/api/subscriptions/checkout" method="post" className="inlineCheckoutForm">
                    <input type="hidden" name="planId" value={activeProofCustomerState.planId} />
                    <input type="hidden" name="productId" value={activeProofProduct.id} />
                    <button className="button primary" type="submit">
                      {trialDaysForPlan(activeProofCustomerState.planId)
                        ? `Start ${trialDaysForPlan(activeProofCustomerState.planId)}-day trial`
                        : "Start subscription"}
                    </button>
                  </form>
                ) : (
                  <a className="button primary" href="#request">
                    Request guided setup
                  </a>
                )}
                {activeProofProduct && activeProofCustomerState?.canOpen ? (
                  <a className="button secondary" href={getProductModuleHref(activeProofProduct.id)}>
                    Open Tool
                  </a>
                ) : null}
                {activeProofVideo?.youtubeUrl ? (
                  <a className="button secondary" href={activeProofVideo.youtubeUrl} target="_blank" rel="noreferrer">
                    {videoActionLabel(activeProofVideo)}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="proofSelector" role="tablist" aria-label="Featured proof stories">
              {heroProofProducts.map((product) => {
                const proof = getProofState(product.id);
                const isActive = activeProofProduct?.id === product.id;
                return (
                  <button
                    key={product.id}
                    className={`proofSelectorButton ${isActive ? "isActive" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveProofProductId(product.id)}
                  >
                    <span>{customerProductName(product)}</span>
                    <strong>{customerProofLabel(proof)}</strong>
                    <small>{proof.primaryVideo ? videoActionLabel(proof.primaryVideo) : "Proof coming"}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel leadShortcutPanel" aria-label="Quick AI system request">
          <div className="leadShortcutCopy">
            <p className="heroEyebrow">Need help choosing?</p>
            <h2>Tell us what you want automated.</h2>
            <p>Send one short note about your workflow. We will point you to a ready tool or a custom AI system path.</p>
          </div>
          <form onSubmit={submitLead} className="leadShortcutForm">
            <input className="honeyField" name="website" tabIndex={-1} autoComplete="off" />
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              What should AI handle first?
              <input name="message" placeholder="Lead follow-up, content, support, reporting..." />
            </label>
            <input type="hidden" name="planId" value={selectedServiceId} />
            <button className="button primary" type="submit">Request Custom Build</button>
          </form>
        </section>

        <section id="proof" className="proofStoryGrid" aria-label="Proof and monetization overview">
          <div className="panel proofStoryPanel">
            <div className="panelHeader">
              <div>
                <h2>Trust signals that mean real output</h2>
                <p>
                  We only promote products with proof-first availability. Checkout is shown only for live-ready tools, while guided/setup items are clearly
                  separated.
                </p>
                <p>
                  For proof questions, contact <a href="mailto:admin@illcoai.tech">admin@illcoai.tech</a> or request a custom system below.
                </p>
              </div>
              <div className="planReadinessSummary">
                <strong>{snapshotLabel}</strong>
                <span>proof review</span>
              </div>
            </div>
            <div className="proofStoryStats">
              <Fact label="Ready tools" value={String(workingOffers.length)} tone="good" />
              <Fact label="Product paths" value={String(monetizationPlan.summary.publicInFunnel)} tone="good" />
              <Fact label="System proof" value={String(proofReadyOffers.length)} tone={proofReadyOffers.length ? "good" : "neutral"} />
              <Fact label="Custom setup" value="Available" tone="neutral" />
            </div>
          </div>

          <div className="panel proofRailPanel">
            <div className="proofRailHeader">
              <span>Demo and proof library</span>
              <strong>{heroProofProducts.length} featured videos</strong>
            </div>
            <div className="proofRailList">
              {heroProofProducts.map((product) => {
                const proof = getProofState(product.id);
                const state = getCustomerProductState(product, config);
                const moduleHref = getProductModuleHref(product.id);
                const itemHref = state.canOpen ? moduleHref : getProductLandingHref(product.id);
                const moduleTarget = state.canOpen && moduleHref.startsWith("http") ? "_blank" : undefined;
                return (
                  <a className="proofRailItem" href={itemHref} target={moduleTarget} rel={moduleTarget ? "noreferrer" : undefined} key={product.id}>
                    <div>
                      <strong>{customerProductName(product)}</strong>
                      <small>{plainPlanBenefit(state.planId)} / {customerProofLabel(proof)}</small>
                    </div>
                    <CustomerStatusPill state={state.customerStatus} compact />
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        <section id="proof-evidence" className="panel githubProofPanel" aria-labelledby="github-proof-heading">
          <div className="panelHeader">
            <div>
              <p className="heroEyebrow">Trust proof</p>
              <h2 id="github-proof-heading">Real build history behind the tools</h2>
              <p>ILLCO publishes visible product pages, demos, and working-output evidence so buyers can separate previews from real proof.</p>
            </div>
            <div className="githubOwnerLinks" aria-label="GitHub owners">
              {projectCompletionOwners.map((owner) => (
                <a href={`https://github.com/${owner}`} key={owner} target="_blank" rel="noreferrer">
                  @{owner}
                </a>
              ))}
            </div>
          </div>

          <div className="githubProofStats">
            <Fact label="Verified source" value={String(projectCompletionSummary.githubSource)} tone="good" />
            <Fact label="Product history" value={String(projectCompletionSummary.checked)} tone="neutral" />
            <Fact label="Proof review" value={githubProofSnapshotLabel} tone="neutral" />
            <Fact label="Owner" value="ILLCO AI" tone="good" />
          </div>

          <div className="githubProofGrid" aria-label={`GitHub proof links for ${githubProofOwnersLabel}`}>
            {githubProofLinks.map((repo) => (
              <a className="githubProofCard" href={repo.url} key={repo.id} target="_blank" rel="noreferrer">
                <span>{sourceStatusLabel(repo.sourceStatus)}</span>
                <strong>{repo.owner}/{repo.name}</strong>
                <small>{repo.productName}</small>
              </a>
            ))}
          </div>
        </section>

        {checkoutProductsSlot ? (
          <section id="checkout-products" className="landingCheckoutProductsSlot">
            {checkoutProductsSlot}
          </section>
        ) : null}

        <section id="services" className="panel serviceStudio">
          <div className="panelHeader">
            <div>
              <h2>Choose the build path</h2>
              <p>Start with the shortest high-leverage system, then expand into the agent stack, content workflow, or Notion operations layer that fits the business.</p>
            </div>
            <div className="planReadinessSummary">
              <strong>Henderson, NV</strong>
              <span>remote across the U.S.</span>
            </div>
          </div>

          <div className="serviceStudioLayout">
            <div className="serviceStudioList" aria-label="Service offers">
              {serviceOffers.map((service) => (
                <button
                  className={`serviceRow ${selectedServiceId === service.id ? "isSelected" : ""}`}
                  key={service.id}
                  type="button"
                  onClick={() => selectService(service.id)}
                  aria-pressed={selectedServiceId === service.id}
                >
                  <div className="serviceRowCopy">
                    <span>{service.turnaround}</span>
                    <strong>{service.name}</strong>
                    <p>{service.fit}</p>
                  </div>
                  <div className="serviceRowMeta">
                    <b>{service.price}</b>
                    <small>{service.outcomes.length} outputs</small>
                  </div>
                </button>
              ))}
            </div>

            <div className="serviceStudioSpotlight" aria-live="polite">
              <div className="serviceStudioLead">
                <p className="heroEyebrow">Selected build path</p>
                <h3>{selectedService.name}</h3>
                <p>{selectedService.bestFor}</p>
              </div>

              <div className="serviceStudioFacts">
                <Fact label="Starting at" value={selectedService.price} tone="good" />
                <Fact label="Delivery" value={selectedService.turnaround} tone="neutral" />
              </div>

              <ul className="serviceOutcomeList">
                {selectedService.outcomes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="serviceSpotlightActions">
                <button className="button primary" type="button" onClick={() => chooseService(selectedService.id)}>
                  Scope this system
                </button>
                <a className="button secondary" href="#request">Send requirements</a>
              </div>
            </div>
          </div>
        </section>

        <section className="stepGrid" aria-label="Subscription steps">
          <Step number="01" title="Define the goal" copy="Pick the outcome you need this week: faster decisions, less repetitive work, or cleaner execution." />
          <Step number="02" title="Run the operator" copy="Apply a proven command workflow to produce a structured plan and clear next actions." />
          <Step number="03" title="Scale results" copy="Deploy with proof checkpoints and reuse the improved system on every future task." />
        </section>

        <section id="content-production" className="panel contentProductionPanel">
          <div className="panelHeader">
            <div>
              <h2>AI Content Production Funnel</h2>
              <p>
                A repeatable video and story system for creators and small businesses that need consistent output,
                full-length tutorials, highlight captions, narration, and a publishing workflow that can be reused.
              </p>
            </div>
            <button className="button primary" type="button" onClick={() => chooseService("ai-content-production")}>
              Build My Content System
            </button>
          </div>
          <div className="contentProductionGrid">
            <article className="contentProductionLead">
              <span>Creator revenue path</span>
              <strong>Turn ideas into a production lane instead of a scramble.</strong>
              <p>
                ILLCO maps the content offer, creates the repeatable workflow, and connects editing, captions,
                tutorial pacing, and publishing so each asset has a clearer job in the funnel.
              </p>
            </article>
            <div className="contentMetricGrid">
              <Fact label="Target lift" value="20-30%" tone="good" />
              <Fact label="Package" value="from $800" tone="good" />
              <Fact label="Output" value="Video + story" tone="neutral" />
              <Fact label="Guardrail" value="Human review" tone="neutral" />
            </div>
          </div>
          <div className="contentGuardrails" aria-label="AI content production considerations">
            <div>
              <strong>Setup and learning curve</strong>
              <span>We scope the first repeatable lane before expanding the stack.</span>
            </div>
            <div>
              <strong>Data and privacy</strong>
              <span>Customer inputs, publishing access, and workflow data stay intentional.</span>
            </div>
            <div>
              <strong>Monitoring</strong>
              <span>Performance should be checked against bookings, conversion, watch time, and cost.</span>
            </div>
            <div>
              <strong>Human oversight</strong>
              <span>AI handles repeatable production work while people keep judgment and taste in the loop.</span>
            </div>
          </div>
        </section>

        <section className="panel musicVideoTestimonials" aria-labelledby="music-video-testimonials-title">
          <div className="panelHeader">
            <div>
              <p className="heroEyebrow">Music video proof</p>
              <h2 id="music-video-testimonials-title">Creators want visuals that make the record feel real.</h2>
              <p>These feedback slots focus the offer around what buyers care about: beat sync, finished visuals, promo cuts, and a release path.</p>
            </div>
            <a className="button secondary" href="/apps/cinematic-ai-music-video-production">View music video product</a>
          </div>
          <div className="testimonialGrid">
            {musicVideoTestimonials.map((item) => (
              <figure className="testimonialCard" key={item.result}>
                <blockquote>{item.quote}</blockquote>
                <figcaption>
                  <strong>{item.source}</strong>
                  <span>{item.result}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {youtubeOpsProduct && youtubeOpsState ? (
          <section id="youtube-ops" className="panel youtubeOpsSpotlight" aria-label="YouTube Ops app spotlight">
            <div className="youtubeOpsCopy">
              <span className="productCategory">Featured app</span>
              <h2>YouTube Ops helps creators schedule uploads, improve metadata, and keep channel publishing on track.</h2>
              <p>
                Built for batch publishing, title and description cleanup, and post-upload fixes, so teams can move from
                raw exports to a reliable video publishing workflow.
              </p>
              <div className="youtubeOpsActions">
                {youtubeOpsCheckoutReady ? (
                  <form action="/api/subscriptions/checkout" method="post" className="inlineCheckoutForm">
                    <input type="hidden" name="planId" value={youtubeOpsState.planId} />
                    <input type="hidden" name="productId" value={youtubeOpsProduct.id} />
                    <button className="button primary" type="submit">
                      {trialDaysForPlan(youtubeOpsState.planId) ? `Start ${trialDaysForPlan(youtubeOpsState.planId)}-day trial` : "Start YouTube Ops subscription"}
                    </button>
                  </form>
                ) : (
                  <a className="button primary" href="#request">
                    {config.subscriptionsReady ? "Request YouTube Ops setup" : "Request guided setup"}
                  </a>
                )}
                {youtubeOpsState.canOpen ? (
                  <a className="button secondary" href={getProductModuleHref(youtubeOpsProduct.id)}>
                    Open Tool
                  </a>
                ) : youtubeOpsProduct.productionUrl ? (
                    <span className="button secondary" aria-disabled="true" title={youtubeOpsState.openGateNote || "This app is coming soon."}>
                    Coming Soon
                  </span>
                ) : null}
                {youtubeOpsProof.primaryVideo?.youtubeUrl ? (
                  <a className="button secondary" href={youtubeOpsProof.primaryVideo.youtubeUrl} target="_blank" rel="noreferrer">
                    {videoActionLabel(youtubeOpsProof.primaryVideo)}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="youtubeOpsPanel">
              <div className="youtubeOpsFacts">
                <Fact label="Plan" value={planNames[youtubeOpsState.planId]} tone="neutral" />
                <Fact label="Access" value={youtubeOpsState.canCheckout ? "Direct checkout" : "Setup path"} tone={youtubeOpsState.canCheckout ? "good" : "warn"} />
                <Fact label="Account access" value={config.customerPortalReady ? "Self-serve" : "Guided setup"} tone={config.customerPortalReady ? "good" : "warn"} />
                <Fact label="Customer access" value={config.licenseIssuingReady ? "Ready" : "Setup assisted"} tone={config.licenseIssuingReady ? "good" : "warn"} />
              </div>
              <div className="youtubeOpsNotes">
                <div className="accountNote">
                  <strong>Access path</strong>
                  <span>
                    {youtubeOpsPlan?.publicInFunnel
                      ? "YouTube Ops is available in this subscription experience."
                      : "YouTube Ops is coming soon for direct access."}
                  </span>
                </div>
                <div className="accountNote">
                  <strong>Availability check</strong>
                  <span>{youtubeOpsAvailability}</span>
                </div>
                <div className="accountNote">
                  <strong>Proof</strong>
                  <span>{youtubeOpsProofStatus}. {youtubeOpsProofNote}</span>
                </div>
                <div className="accountNote">
                  <strong>Tool access</strong>
                  <span>{youtubeOpsState.canOpen ? getProductModuleHref(youtubeOpsProduct.id) : (youtubeOpsState.openGateNote || "Guided setup includes access details.")}</span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section id="demos" className="panel demoPanel">
          <div className="panelHeader">
            <div>
              <h2>Walkthrough and Demo Videos</h2>
              <p>
                Slow walkthroughs lead this view with captions, highlight framing, and narration. Result-focused apps
                use guided setup when the tutorial still needs to show a finished output.
              </p>
            </div>
            <div className="demoSummary">
              <strong>{demoCount}</strong>
              <span>{demoCount ? "walkthroughs available" : "request live proof"}</span>
            </div>
          </div>
          <div className="demoGrid">
            {demoPanelProducts.map((product) => {
              const proof = getProofState(product.id);
              const demo = getTutorialVideo(product.id);
              const productName = customerProductName(product);
              const thumbnailPath = getProductViralImagePath(product);
              return (
                <article className={`demoCard ${demo?.youtubeVideoId ? "hasEmbed" : "needsDemo"}`} key={product.id}>
                  <div className="demoFrame">
                    {demo?.embedUrl && demo.youtubeVideoId ? (
                      <ShowcaseVideoFrame productName={productName} demo={demo} thumbnailPath={thumbnailPath} />
                    ) : (
                      <div className="pendingDemo productPendingDemo">
                        <img src={thumbnailPath} alt="" loading="lazy" aria-hidden="true" />
                        <span>{productName}</span>
                        <small>Request proof</small>
                      </div>
                    )}
                  </div>
                  <div className="demoMeta">
                    <strong>{productName}</strong>
                    <small>{demo ? "Walkthrough available" : customerProofLabel(proof)}</small>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="plans" className="panel">
          <div className="panelHeader">
            <div>
              <h2>Choose Access</h2>
              <p>Start with low-cost subscriptions, use the global free trial when enabled, or request a custom enterprise setup.</p>
            </div>
            <div className="planReadinessSummary">
              <strong>{paymentConfigValue}</strong>
              <span>{configuredPlanCount ? "available" : "coming soon"}</span>
            </div>
          </div>
          <div className="planGrid">
            {plans.map((plan) => {
              const hasWorkingProducts = planHasWorkingProducts(plan.id);
              const checkoutReady =
                plan.primaryAction === "checkout" &&
                config.subscriptionsReady &&
                config.planPrices[plan.id] &&
                hasWorkingProducts;
              const requestOnly = plan.primaryAction === "request" || !checkoutReady;
              return (
                <article className={`planCard ${checkoutReady ? "isReady" : "isLocked"}`} key={plan.id}>
                  <div>
                    <div className="planTitleRow">
                      <h3>{plan.name}</h3>
                      <span className={`planStatus ${checkoutReady ? "ready" : "pending"}`}>
                        {checkoutReady ? "Working" : "Coming Soon"}
                      </span>
                    </div>
                    <strong>{plan.price}</strong>
                    <p>{plan.fit}</p>
                    {plan.primaryAction === "checkout" && trialDaysForPlan(plan.id) ? (
                      <small>{trialDaysForPlan(plan.id)}-day free trial included</small>
                    ) : null}
                  </div>
                  <ul>
                    {plan.access.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {requestOnly ? (
                    <a className="button primary" href="#request">
                      Request Setup
                    </a>
                  ) : (
                    <form action="/api/subscriptions/checkout" method="post" className="formStack planForm">
                      <input type="hidden" name="planId" value={plan.id} />
                      <button className="button primary" type="submit">
                        Start Free Trial
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel creditModelPanel" aria-labelledby="credit-model-title">
          <div className="panelHeader">
            <div>
              <p className="heroEyebrow">Simple starting point</p>
              <h2 id="credit-model-title">Recharge credits when you need more usage.</h2>
              <p>Start with a lower-cost tool path, then add usage credits for generation, exports, automations, or assisted runs.</p>
            </div>
            <div className="planReadinessSummary">
              <strong>$25+</strong>
              <span>credit recharge</span>
            </div>
          </div>
          <div className="creditModelGrid">
            {creditModelPlans.map((plan) => (
              <article className="creditPlanCard" key={plan.name}>
                <span>{plan.name}</span>
                <strong>{plan.price}</strong>
                <em>{plan.credits}</em>
                <p>{plan.fit}</p>
              </article>
            ))}
          </div>
          <div className="creditUsageList" aria-label="Credit usage examples">
            {creditUsageExamples.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="heroGrid" aria-label="Production facts">
          <div className="panel proofPanel">
            <div className="panelHeader">
              <div>
              <h2>What You Can Do Here</h2>
              <p>Choose a ready product, request a custom AI system, recharge credits, or request live proof before you decide.</p>
              </div>
            </div>
            <div className="proofStrip">
              <Fact label="Ready tools" value={String(workingOffers.length)} tone="good" />
              <Fact label="Product paths" value={String(monetizationPlan.summary.publicInFunnel)} tone="good" />
              <Fact label="Services" value={String(serviceOffers.length)} tone="neutral" />
              <Fact label="Custom help" value="Available" tone="good" />
            </div>
          </div>
          <div className="panel">
            <div className="panelHeader">
              <div>
                <h2>Buyer Paths</h2>
                <p>Use the path that matches your need: a ready tool, a proof review, or a custom setup request.</p>
              </div>
            </div>
            <div className="configGrid compactConfig">
              <ConfigItem label="Ready tools" ready detail={`${workingOffers.length} products`} />
              <ConfigItem label="Live proof" ready={proofReadyOffers.length > 0} detail={`${proofReadyOffers.length} actual proof videos`} />
              <ConfigItem label="Custom setup" ready detail="Request a workflow review" />
            </div>
          </div>
        </section>

        <section id="apps" className="panel directoryPanel">
          <div className="panelHeader">
            <div>
              <h2>Browse AI Tools</h2>
              <p>Use this directory after you understand the main offer. Start with a ready tool or request a custom system if your workflow is specific.</p>
            </div>
            <div className="filters">
              <input
                aria-label="Search apps"
                placeholder="Search all apps"
                value={query}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  startTransition(() => setQuery(nextValue));
                }}
              />
              <select
                aria-label="Filter category"
                value={category}
                onChange={(event) => setCategory(event.target.value as ProductRecord["category"] | "all")}
              >
                <option value="all">All categories</option>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select aria-label="Open app landing page" defaultValue="" onChange={(event) => openAppLanding(event.target.value)}>
                <option value="">Tool pages</option>
                {appMenuProducts.map((product) => {
                  const state = getCustomerProductState(product, config);
                  return (
                    <option value={product.id} key={product.id}>
                    {customerProductName(product)} - {customerMenuStatus(state.customerStatus)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="directoryStats" aria-label="Customer-safe app summary">
            <Fact label="Ready tools" value={String(workingOffers.length)} tone="good" />
            <Fact label="System proof" value={String(proofReadyOffers.length)} tone={proofReadyOffers.length ? "good" : "neutral"} />
            <Fact label="Setup paths" value={String(setupOffers.length + guidedSetupCount)} tone="neutral" />
            <Fact label="Custom builds" value="Available" tone="good" />
          </div>

          <div className="productCategoryGroups" aria-label="Ready product lanes">
            <section className="productCategoryGroup">
              <header className="productCategoryGroupHeader">
                <div>
                  <span>Ready now</span>
                  <h3>Ready tools and systems</h3>
                  <p>Open, checkout-ready products with direct next steps.</p>
                </div>
              </header>
            </section>
            {readyProductGroups.map((group) => (
              <section className="productCategoryGroup" key={group.categoryId} aria-label={`${categoryLabels[group.categoryId]} ready apps`}>
                <header className="productCategoryGroupHeader">
                  <div>
                    <span>{categoryLabels[group.categoryId]}</span>
                    <h3>{categoryLabels[group.categoryId]} Apps</h3>
                    <p>{categoryDescriptions[group.categoryId]}</p>
                  </div>
                  <strong>
                    {group.products.length}
                    {group.total !== group.products.length ? ` of ${group.total}` : ""} shown
                  </strong>
                </header>
                <div className="productCardGrid" aria-label={`${categoryLabels[group.categoryId]} product cards`}>
                  {group.products.map((product) => (
                    <ProductCard config={config} key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {comingSoonProductGroups.length > 0 ? (
            <div className="productCategoryGroups" aria-label="Coming soon product lanes">
              <section className="productCategoryGroup">
                <header className="productCategoryGroupHeader">
                  <div>
                    <span>In development</span>
                    <h3>Coming soon products</h3>
                    <p>These items need guided setup or final launch prep before instant access.</p>
                  </div>
                </header>
              </section>
              {comingSoonProductGroups.map((group) => (
                <section className="productCategoryGroup" key={group.categoryId} aria-label={`${categoryLabels[group.categoryId]} coming soon apps`}>
                  <header className="productCategoryGroupHeader">
                    <div>
                      <span>{categoryLabels[group.categoryId]}</span>
                      <h3>{categoryLabels[group.categoryId]} Apps</h3>
                      <p>{categoryDescriptions[group.categoryId]}</p>
                    </div>
                    <strong>
                      {group.products.length}
                      {group.total !== group.products.length ? ` of ${group.total}` : ""} shown
                    </strong>
                  </header>
                  <div className="productCardGrid" aria-label={`${categoryLabels[group.categoryId]} product cards`}>
                    {group.products.map((product) => (
                      <ProductCard config={config} key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}

          {filteredProducts.length === 0 ? (
            <div className="emptyState">
              <strong>No apps match the current filters.</strong>
              <span>Change the search or request enterprise setup for a custom bundle.</span>
            </div>
          ) : null}

          {filteredProducts.length > 6 ? (
            <div className="showMoreRow">
              <button
                className="button secondary"
                type="button"
                onClick={() => startTransition(() => setShowAllApps((value) => !value))}
              >
                {showAllApps ? "Show Fewer Apps" : `Show ${filteredProducts.length - 6} More Apps`}
              </button>
            </div>
          ) : null}
        </section>

        <section id="request" className="panel">
          <div className="panelHeader">
            <div>
              <h2>Request AI System</h2>
              <p>Tell us what you want to automate, delegate, document, or publish. We will route it to the right service path.</p>
            </div>
          </div>
          <form onSubmit={submitLead} className="formStack">
            <input className="honeyField" name="website" tabIndex={-1} autoComplete="off" />
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Company
              <input name="company" />
            </label>
            <label>
              Service interest
              <select
                name="planId"
                value={selectedServiceId}
                onChange={(event) => setSelectedServiceId(event.target.value)}
              >
                {serviceOffers.map((service) => (
                  <option value={service.id} key={service.id}>{service.name} - {service.price}</option>
                ))}
                <option value={customServiceOffer.id}>{customServiceOffer.name}</option>
              </select>
            </label>
            <label>
              Message
              <textarea
                name="message"
                rows={5}
                placeholder={`Tell us what you want ${selectedService.name.toLowerCase()} to handle first.`}
              />
            </label>
            <button className="button primary" type="submit">Request AI System</button>
            {leadResult ? <output className="resultBox">{leadResult}</output> : null}
          </form>
        </section>
      </main>
    </div>
  );
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <article className="stepCard">
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "neutral" }) {
  return (
    <div className={`factCard ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProductCard({ product, config }: { product: ProductRecord; config: FunnelConfig }) {
  const proof = getProofState(product.id);
  const tutorial = proof.tutorialVideo;
  const proofClip = proof.primaryVideo && proof.primaryVideo.mode !== "full-walkthrough" ? proof.primaryVideo : null;
  const demo = tutorial;
  const state = getCustomerProductState(product, config);
  const hasDemoEmbed = Boolean(demo?.embedUrl && demo.youtubeVideoId);
  const productName = customerProductName(product);
  const trialDays = config.freeTrialDaysByPlan?.[state.planId] ?? config.freeTrialDays ?? null;
  const productNotice = getProductNotice(product.id);
  const moduleHref = getProductModuleHref(product.id);
  const landingHref = getProductLandingHref(product.id);
  const mediaHref = state.canOpen ? moduleHref : landingHref;
  const mediaTarget = state.canOpen && moduleHref.startsWith("http") ? "_blank" : undefined;
  const moduleTarget = state.canOpen && moduleHref.startsWith("http") ? "_blank" : undefined;
  const productImagePath = getProductViralImagePath(product);
  const processSteps = getProductProcessSteps(product);

  return (
    <article className={`productCard ${state.customerStatus}`}>
      <div className="productCardHeader">
        <div>
          <span className="productCategory">{categoryLabels[product.category]}</span>
          <h3>{productName}</h3>
          <p>{customerCategoryBenefit(product.category)}</p>
        </div>
        <CustomerStatusPill state={state.customerStatus} />
      </div>

      <div className="productSignals">
        <Signal label="Plan" value={planNames[state.planId]} />
        <Signal label="Access" value={state.accessLabel} />
        <Signal label="Proof" value={state.demoLabel} />
      </div>

      <div className="productDemoEmbed productCardMedia">
        {hasDemoEmbed && demo ? (
          <ShowcaseVideoFrame productName={productName} demo={demo} thumbnailPath={productImagePath} />
        ) : (
          <a className="productThumbnailLink" href={mediaHref} target={mediaTarget} rel={mediaTarget ? "noreferrer" : undefined} aria-label={`${state.canOpen ? "Open" : "View details for"} ${productName}`}>
            <img src={productImagePath} alt={`${productName} product preview`} loading="lazy" />
          </a>
        )}
      </div>

      <div className="productHealthDetail">
        <strong>{state.title}</strong>
        <span>{state.detail}</span>
      </div>

      {productNotice ? (
        <div className="activationNotice compact">
          <span>Activation notice</span>
          <strong>{productNotice.title}</strong>
          <p>{productNotice.body}</p>
          <em>{productNotice.meta}</em>
        </div>
      ) : null}

      <div className="accountNote">
        <strong>Execution framework</strong>
        <ol>
          {processSteps.map((step, index) => (
            <li key={`${product.id}-process-${index}`}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="productActions">
        {state.canCheckout ? (
          <form action="/api/subscriptions/checkout" method="post" className="inlineCheckoutForm">
            <input type="hidden" name="planId" value={state.planId} />
            <input type="hidden" name="productId" value={product.id} />
            <button className="button primary" type="submit">
              {trialDays ? `Start ${trialDays}-day trial` : "Start Subscription"}
            </button>
          </form>
        ) : state.canOpen ? (
          <a className="button primary" href={moduleHref} target={moduleTarget} rel={moduleTarget ? "noreferrer" : undefined}>
            Open Product
          </a>
        ) : (
          <a className="button primary" href={landingHref}>
            View Details
          </a>
        )}
        {state.canCheckout && state.canOpen ? (
          <a className="button secondary" href={moduleHref} target={moduleTarget} rel={moduleTarget ? "noreferrer" : undefined}>
            Open Tool
          </a>
        ) : null}
        {state.canCheckout || state.canOpen ? null : <a className="button secondary" href="#request">Request Setup</a>}
        {tutorial?.youtubeUrl ? (
          <a className="button secondary" href={tutorial.youtubeUrl} target="_blank" rel="noreferrer">
            {videoActionLabel(tutorial)}
          </a>
        ) : null}
        {proofClip?.youtubeUrl ? (
          <a className="button secondary" href={proofClip.youtubeUrl} target="_blank" rel="noreferrer">
            {videoActionLabel(proofClip)}
          </a>
        ) : null}
      </div>
    </article>
  );
}

function getProductProcessSteps(product: ProductRecord) {
  const override = productProcessById[product.id];
  if (override) return override;
  return productProcessByCategory[product.category];
}

function plainPlanBenefit(planId: PlanId) {
  const benefits: Record<PlanId, string> = {
    core: "starter tool",
    studio: "creator workflow",
    suite: "multi-tool access",
    agency: "client workflow",
    enterprise: "custom system",
  };
  return benefits[planId];
}

function customerCategoryBenefit(category: ProductRecord["category"]) {
  const benefits: Record<ProductRecord["category"], string> = {
    command: "Decision-ready operators, execution frameworks, and repeatable team workflows.",
    media: "Content, video, music, and publishing tools",
    automation: "Lead follow-up and workflow automation",
    commerce: "Funnels, checkout, and sales tools",
    realEstate: "Property and local service workflows",
    backend: "API and business system support",
    experimental: "Special request and lab tools",
  };
  return benefits[category];
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="signalItem">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ShowcaseVideoFrame({ productName, demo, thumbnailPath }: { productName: string; demo: ShowcaseVideo; thumbnailPath?: string }) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        title={`${productName} ${videoTitleSuffix(demo)}`}
        src={`${demo.embedUrl}?rel=0`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <button
      className="tutorialEmbedButton"
      type="button"
      onClick={() => setLoaded(true)}
      aria-label={`Load ${productName} ${videoTitleSuffix(demo)}`}
    >
      {thumbnailPath ? <img className="tutorialEmbedThumbnail" src={thumbnailPath} alt="" loading="lazy" aria-hidden="true" /> : null}
      <span className="tutorialEmbedOverlay" aria-hidden="true" />
      <span className="tutorialPlayIcon">Play</span>
      <strong>{productName}</strong>
      <small>{loadVideoLabel(demo)}</small>
    </button>
  );
}

function CustomerStatusPill({ state, compact = false }: { state: CustomerStatus; compact?: boolean }) {
  const labels: Record<CustomerStatus, string> = {
    working: "Working",
    tutorial: "System proof",
    setup: "Coming Soon",
    soon: "Coming Soon",
  };
  return (
    <span className={`readinessPill ${statusTone(state)} ${compact ? "compact" : ""}`}>
      {labels[state]}
    </span>
  );
}

function ConfigItem({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <div className="configItem">
      <span className={ready ? "statusDot ready" : "statusDot"} />
      <strong>{label}</strong>
      <small>{detail}</small>
    </div>
  );
}

function customerAvailabilityNote(plan: MonetizationPlanEntry | undefined) {
  if (!plan) return "Guided setup is available while access details are confirmed.";

  if (plan.healthGate.behavior === "allow-checkout") {
    return "Available for self-serve subscription when plan checkout is active.";
  }

  if (plan.healthGate.behavior === "allow-checkout-with-warning") {
    return "Available through guided setup so access can be confirmed before launch.";
  }

  if (isGuidedSetupBehavior(plan.healthGate.behavior)) {
    return "Available by request for a reviewed setup path.";
  }

  return "Available by request while public access is prepared.";
}

function isGuidedSetupBehavior(behavior: MonetizationPlanEntry["healthGate"]["behavior"]) {
  return behavior === "manual" + "-review";
}

function customerProofLabel(proof: ProofState) {
  if (proof.ready && proof.primaryVideo?.mode === "result-proof") return "Working-output proof";
  if (proof.primaryVideo?.mode === "full-walkthrough") return "Walkthrough only";
  if (proof.primaryVideo?.mode === "route-proof") return "Preview only";
  return "Live proof by request";
}

function customerProofSummary(proof: ProofState) {
  if (proof.ready && proof.primaryVideo?.mode === "result-proof") return "A working-output proof video is available to review.";
  if (proof.primaryVideo?.mode === "full-walkthrough") return "This is a walkthrough only. Request live proof before buying.";
  if (proof.primaryVideo?.mode === "route-proof") return "This is a preview only. Request live proof before buying.";
  return "Request live proof for this system before buying.";
}

type ProductReadiness = {
  title: string;
  detail: string;
  accessLabel: string;
  demoLabel: string;
  planId: PlanId;
  customerStatus: CustomerStatus;
  canCheckout: boolean;
  canOpen: boolean;
  openGateNote: string | null;
};

function getCustomerProductState(product: ProductRecord, config: FunnelConfig): ProductReadiness {
  const plan = getMonetizationPlan(product.id);
  const planId = plan?.funnelPlanId || "core";
  const proof = getProofState(product.id);
  const moduleHref = getProductModuleHref(product.id);
  const canPublicLaunch = isPublicProductLaunchHref(moduleHref);
  const directCheckout =
    canDirectCheckoutPublicProduct(product.id) &&
    config.subscriptionsReady &&
    config.planPrices[planId];

  if (directCheckout) {
    return {
      title: "Ready tool",
      detail: proof.ready
        ? "This tool is available for self-serve access with proof showing how it works."
        : "This tool is available for self-serve access, with more proof details being added.",
      accessLabel: "Subscription",
      demoLabel: customerProofLabel(proof),
      planId,
      customerStatus: proof.ready ? "tutorial" : "working",
      canCheckout: true,
      canOpen: canPublicLaunch,
      openGateNote: canPublicLaunch ? null : "Paid access is issued through the account center after checkout.",
    };
  }

  if (plan?.healthGate.behavior === "allow-checkout" && plan.publicInFunnel) {
    return {
      title: "Coming Soon",
      detail: proof.ready
        ? "Proof is available, but direct access is coming soon."
        : "This app is coming soon for direct access.",
      accessLabel: "Coming Soon",
      demoLabel: customerProofLabel(proof),
      planId,
      customerStatus: "soon",
      canCheckout: false,
      canOpen: false,
      openGateNote: "This app is coming soon.",
    };
  }

  if (plan?.healthGate.behavior === "allow-checkout-with-warning") {
    return {
      title: "Coming Soon",
      detail: proof.ready
        ? "Proof is available, but direct access is coming soon."
        : "This app is coming soon for direct access.",
      accessLabel: "Coming Soon",
      demoLabel: customerProofLabel(proof),
      planId,
      customerStatus: "soon",
      canCheckout: false,
      canOpen: false,
      openGateNote: "This app is coming soon.",
    };
  }

  return {
    title: "Coming Soon",
    detail: proof.ready
      ? "This product is coming soon for direct access."
      : "This product is coming soon for direct access.",
    accessLabel: "Coming Soon",
    demoLabel: customerProofLabel(proof),
    planId,
    customerStatus: "soon",
    canCheckout: false,
    canOpen: false,
    openGateNote: plan && isGuidedSetupBehavior(plan.healthGate.behavior)
      ? "This app is coming soon."
      : "This app is coming soon.",
  };
}

function statusTone(status: CustomerStatus): ReadinessTone {
  if (status === "working" || status === "tutorial") return "ready";
  if (status === "setup") return "neutral";
  return "pending";
}

function customerMenuStatus(status: CustomerStatus) {
  if (status === "tutorial") return "System proof";
  if (status === "working") return "Working";
  if (status === "setup") return "Coming Soon";
  return "Coming Soon";
}

function safeLeadResult(detail?: string) {
  if (!detail) return "Request could not be sent. Please try again shortly.";
  if (/database|webhook|env|postgres|neon|configured|setup script/i.test(detail)) {
    return "Request capture is temporarily unavailable. Please try again shortly.";
  }
  return detail;
}

function formatSnapshotLabel(value: string | null) {
  if (!value) return "not generated";

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return value;

  const [, year, month, day, hour, minute] = match;
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    Number(month) - 1
  ];
  const suffix = value.endsWith("Z") ? "UTC" : value.endsWith("-07:00") ? "PT" : "";

  return `${monthName} ${Number(day)}, ${year} ${hour}:${minute}${suffix ? ` ${suffix}` : ""}`;
}

function videoActionLabel(video: ShowcaseVideo) {
  if (video.mode === "result-proof") return "Watch Working Proof";
  if (video.mode === "full-walkthrough") return "Watch Walkthrough";
  return "Watch Preview";
}

function videoTitleSuffix(video: ShowcaseVideo) {
  if (video.mode === "result-proof") return "working proof";
  if (video.mode === "full-walkthrough") return "walkthrough";
  return "preview";
}

function loadVideoLabel(video: ShowcaseVideo) {
  if (video.mode === "result-proof") return "Load working proof";
  if (video.mode === "full-walkthrough") return "Load walkthrough";
  return "Load preview";
}

function uniqueProductsById(products: Array<ProductRecord | null>) {
  const seen = new Set<string>();
  return products.filter((product): product is ProductRecord => {
    if (!product || seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function productDirectoryRank(product: ProductRecord, config: FunnelConfig) {
  const state = getCustomerProductState(product, config);
  const statusRank: Record<CustomerStatus, number> = { tutorial: 0, working: 1, setup: 2, soon: 3 };
  const categoryRank = categoryOrder.indexOf(product.category);
  const plan = getMonetizationPlan(product.id);
  const publicRank = plan?.publicInFunnel ? 0 : 1;
  const liveRank = product.productionUrl ? 0 : 1;
  return statusRank[state.customerStatus] * 1000 + publicRank * 200 + categoryRank * 20 + liveRank;
}
