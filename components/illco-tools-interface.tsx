import { demoVideos } from "@/lib/demo-videos";
import { products, type ProductRecord } from "@/lib/deployments";
import { CheckoutProductsSection } from "@/components/checkout-products-section";
import { ComingSoonCountdown } from "@/components/coming-soon-countdown";
import { MasterAccessPanel } from "@/components/master-access-panel";
import { readMasterAccessSession } from "@/lib/master-access";
import { getProductModuleHref, isPublicProductLaunchHref } from "@/lib/product-routes";
import {
  completionStatusLabel,
  getProjectCompletionRecord,
  projectCompletionGeneratedAt,
  projectCompletionOwners,
  projectCompletionSummary,
  sourceStatusLabel,
} from "@/lib/project-completion";

const categoryLabels: Record<ProductRecord["category"], string> = {
  command: "Command",
  media: "Media",
  automation: "Automation",
  commerce: "Commerce",
  realEstate: "Real Estate",
  backend: "Backend",
  experimental: "Experimental",
};

const categoryRank: Record<ProductRecord["category"], number> = {
  command: 0,
  automation: 1,
  media: 2,
  commerce: 3,
  realEstate: 4,
  backend: 5,
  experimental: 6,
};

const crazyReelIds = [
  "sora-vault-cloud",
  "illco-ai-video",
  "rap-lyric-generator",
  "visual-voice-board",
  "uap-ai-lab",
  "mastering-studio-platform",
] as const;

type CrazyReelItem = {
  projectId: (typeof crazyReelIds)[number];
  title: string;
  productName: string;
  category: string;
  videoId: string;
  embedUrl: string;
  youtubeUrl: string;
  moduleHref: string;
  signal: string;
  caption: string;
};

type FinishedProductRecord = ProductRecord & { productionUrl: string };

export async function IllcoToolsInterface() {
  const masterAccess = await readMasterAccessSession();
  const masterUnlockedProductIds = new Set(
    masterAccess.unlocked ? masterAccess.unlockableProducts.map((product) => product.id) : [],
  );
  const toolsProduct = products.find((product) => product.id === "ai-companions-recovered") || null;
  const toolsLaunchUrl = toolsProduct ? getProductModuleHref(toolsProduct.id) : "/tools";
  const appPanels = [...products].sort((left, right) => {
    const leftMain = left.id === "ai-companions-recovered" ? 0 : 1;
    const rightMain = right.id === "ai-companions-recovered" ? 0 : 1;
    return (
      leftMain - rightMain ||
      Number(right.isLive) - Number(left.isLive) ||
      categoryRank[left.category] - categoryRank[right.category] ||
      left.displayName.localeCompare(right.displayName)
    );
  });
  const crazyReel = crazyReelIds
    .map((projectId) => {
      const product = products.find((candidate) => candidate.id === projectId) || null;
      const demo = demoVideos.projects[projectId] || null;
      const videoId = demo?.resultProofYoutubeVideoId || demo?.tutorialYoutubeVideoId || demo?.youtubeVideoId || null;
      const embedUrl = demo?.resultProofEmbedUrl || demo?.tutorialEmbedUrl || demo?.embedUrl || null;
      if (!product || !videoId || !embedUrl) return null;

      return {
        projectId,
        title: reelTitle(product.displayName),
        productName: product.displayName,
        category: categoryLabels[product.category],
        videoId,
        embedUrl,
        youtubeUrl: demo.resultProofYoutubeUrl || demo.tutorialYoutubeUrl || demo.youtubeUrl || `https://www.youtube.com/watch?v=${videoId}`,
        moduleHref: getProductModuleHref(product.id),
        signal: reelSignal(projectId),
        caption: reelCaption(projectId),
      };
    })
    .filter((item): item is CrazyReelItem => Boolean(item));
  const featuredReel = crazyReel[0];
  const livePanels = appPanels.filter((product) => product.isLive);
  const finishedApps = appPanels.filter(
    (product): product is FinishedProductRecord => product.isLive && Boolean(product.productionUrl),
  );
  const finishedAppCategories = new Set(finishedApps.map((product) => product.category)).size;
  const completeProductionApps = finishedApps.filter(
    (product) => getProjectCompletionRecord(product.id)?.completionStatus === "complete",
  );
  const connectedApps = interleaveByCategory(completeProductionApps);
  const productionNeedsWork = finishedApps.filter(
    (product) => getProjectCompletionRecord(product.id)?.completionStatus !== "complete",
  ).length;
  const completionQueue = appPanels.filter((product) => {
    const completion = getProjectCompletionRecord(product.id);
    return completion && completion.completionStatus !== "complete";
  });
  const tickerProducts = [...livePanels.slice(0, 14), ...livePanels.slice(0, 14)];
  const heroFrames = [
    {
      kicker: "Frame 01",
      title: "ILLCO Tools Control",
      metric: "Main shell",
      pulse: "Account / Admin / Apps",
      products: [toolsProduct, ...livePanels.slice(0, 3)].filter(Boolean) as ProductRecord[],
    },
    {
      kicker: "Frame 02",
      title: "Media Engines",
      metric: "Visual lane",
      pulse: "Proof + video surfaces",
      products: appPanels.filter((product) => product.category === "media").slice(0, 4),
    },
    {
      kicker: "Frame 03",
      title: "Automation Stack",
      metric: "Ops lane",
      pulse: "Routing + workflows",
      products: appPanels.filter((product) => product.category === "automation").slice(0, 4),
    },
    {
      kicker: "Frame 04",
      title: "Revenue Surface",
      metric: "Live offers",
      pulse: "Commerce + real estate",
      products: appPanels.filter((product) => product.category === "commerce" || product.category === "realEstate").slice(0, 4),
    },
  ];
  const liveAppCount = products.filter((product) => product.isLive).length;
  const categoryCount = new Set(products.map((product) => product.category)).size;

  const modules = [
    {
      id: "think-for-me-mode",
      name: "Think For Me Mode",
      status: "User Helper",
      signal: "Goal / Plan / CLI / Verify",
      description: "A beginner-safe helper mode that turns messy requests into one clear next move, uses the CLI for evidence, avoids risky changes, and verifies before claiming success.",
      href: "/tools/think-for-me-mode",
      prompt: "Create a goal for this project. Use Plan Mode first. Keep it simple. Assume most work should run through the CLI. Tell me the first small step, the command to run, and how we verify it.",
      sdkView: "Agents SDK view: use it when the helper needs tools, handoffs, guardrails, sessions, or traceable runs. Do not redo a simple prompt-only flow just to sound advanced.",
      redoCheck: "Redo only if the workflow needs multiple specialist agents, tool calls, approvals, memory/session state, or production tracing. Keep it if it is just one assistant prompt plus manual CLI steps.",
      narrationView: "ElevenLabs narration: use it when a demo, course, walkthrough, or proof video needs a clear spoken guide tied to visible actions. Write the script first, generate voiceover, mux with the video, then verify duration, audio stream, and playback.",
      narrationCheck: "Redo narration only if the script lies about what is on screen, timing is off, the voice is too quiet, the audio stream is missing, or the final MP4 fails playback. Keep it if the voice is clear, honest, synced enough, and verified."
    },
    {
      id: "bigo-gift-strategy",
      name: "BIGO Gift Strategy",
      status: "Account Tool",
      signal: "Chrome / ILLCO Login / Agent SDK",
      description: "A logged-in ILLCO workflow that lets BIGO hosts export visible received gift records with a Chrome extension, then contribute consented records into an OpenAI Agent SDK powered strategy layer.",
      href: "/tools/bigo-gift-strategy"
    },
    {
      id: "lyric-video-forge",
      name: "Lyric Video Forge",
      status: "Media Tool",
      signal: "Agent SDK / ASS / FFmpeg QC",
      description: "A production workflow for M3ntally-iLL and ILLCO lyric videos that turns song paths, artist locks, timing failures, rhyme-color rules, and render constraints into a ready-to-run Agent SDK production brief.",
      href: "/tools/lyric-video-forge"
    },
    {
      id: "ai-companion-conversational-intake",
      name: "Conversational Intake",
      status: "Coming Soon",
      signal: "Lead intake",
      description: "Guided onboarding chat that captures goals, timeline, and business context before routing to the right workflow.",
      href: "/apps/ai-companion-conversational-intake"
    },
    {
      id: "ai-companion-prompt-studio",
      name: "Prompt Studio",
      status: "Coming Soon",
      signal: "Content planning",
      description: "Structured prompt composer for repeatable campaigns, automation jobs, and specialist-agent handoffs.",
      href: "/apps/ai-companion-prompt-studio"
    },
    {
      id: "ai-companion-content-production",
      name: "Content Production",
      status: "Coming Soon",
      signal: "Content workflow",
      description: "End-to-end content path for long-form walkthroughs, narrated outputs, and distribution-ready variants.",
      href: "/apps/ai-companion-content-production"
    },
    {
      id: "ai-companion-sales-agent-handoff",
      name: "Sales Agent Hand-off",
      status: "Coming Soon",
      signal: "Lead follow-up",
      description: "Visitor qualification and routing to service requests through the embedded customer sales agent.",
      href: "/apps/ai-companion-sales-agent-handoff"
    },
    {
      id: "ai-companion-command-routing",
      name: "Multi-App Command Routing",
      status: "Coming Soon",
      signal: "Workflow routing",
      description: "Unified routing across tools and services with account-linked context and consistent purchase-access journeys.",
      href: "/apps/ai-companion-command-routing"
    },
    {
      id: "ai-companion-workspace-access",
      name: "Unified Workspace Access",
      status: "Coming Soon",
      signal: "Account workspace",
      description: "Shared account center for profile, session, and app access while monetization and safety gates stay centralized.",
      href: "/apps/ai-companion-workspace-access"
    }
  ] as const;

  return (
    <main id="main-content" className="appLandingWorkspace companionsPageWorkspace">
      <section className="appLandingHero heroPanel companionsPageHero">
        <div className="heroCopy companionsPageHeroCopy">
          <p className="companionsPageEyebrow">ILLCO Command</p>
          <h1>ILLCO Tools</h1>
          <p>
            Buy ready AI tools, request working-output proof, or request a custom system for lead follow-up, content, and business automation.
          </p>
          <div className="heroProofBadges" aria-label="ILLCO Tools launch status">
            <span><strong>{liveAppCount}</strong> ready tools</span>
            <span><strong>{categoryCount}</strong> categories</span>
            <span><strong>{crazyReel.length}</strong> demo videos</span>
          </div>
        </div>
        <div className="commanderCinema" aria-hidden="true">
          <div className="commanderCinemaChrome">
            <span className="commanderCinemaLive">
              <span />
              Live tool preview
            </span>
            <div className="commanderCinemaSceneRail">
              {heroFrames.map((frame) => (
                <span key={`${frame.kicker}-rail`}>
                  <i />
                </span>
              ))}
            </div>
          </div>
          <div className="commanderCinemaRibbons">
            <span />
            <span />
            <span />
          </div>
          {featuredReel ? (
            <div className="commanderCinemaPoster">
              <img src={`https://img.youtube.com/vi/${featuredReel.videoId}/hqdefault.jpg`} alt="" />
              <span />
            </div>
          ) : null}
          <div className="commanderCinemaDepthMap">
            {heroFrames.map((frame) => (
              <span key={`${frame.kicker}-depth`}>{frame.metric}</span>
            ))}
          </div>
          <div className="commanderCinemaFrames">
            {heroFrames.map((frame) => (
              <article className="commanderCinemaFrame" key={frame.kicker}>
                <header>
                  <span>{frame.kicker}</span>
                  <h2>{frame.title}</h2>
                  <p>{frame.pulse}</p>
                </header>
                <div className="commanderCinemaMetric">
                  <strong>{frame.metric}</strong>
                  <small>{frame.products.length} linked panels</small>
                </div>
                <div className="commanderCinemaBars">
                  {frame.products.map((product, index) => (
                    <span key={`${frame.kicker}-${product.id}-${index}-bar`} />
                  ))}
                </div>
                <div className="commanderCinemaApps">
                  {frame.products.map((product, index) => (
                    <span key={`${frame.kicker}-${product.id}-${index}`}>{product.displayName}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="commanderCinemaTicker">
            <div className="commanderCinemaTickerTrack">
              {tickerProducts.map((product, index) => (
                <span key={`${product.id}-${index}`}>{product.displayName}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="topActions companionsPageHeroActions">
          <a className="button primary" href="/commander#request">Request AI System</a>
          <a className="button secondary" href="#checkout-products">Buy Ready Tools</a>
          <a className="button secondary" href="#proof-videos">Request Live Proof</a>
          <a className="button secondary" href={toolsLaunchUrl}>
            Open Tools
          </a>
        </div>
      </section>

      <CheckoutProductsSection />

      <section className="companionsPageSignalStrip" aria-label="ILLCO buyer trust signals">
        <div className="companionsPageSignal">
          <h2>Clear first step</h2>
          <p>Choose a ready tool when the product fits, or request a custom AI system when the workflow is specific.</p>
        </div>
        <div className="companionsPageSignal">
          <h2>Proof before purchase</h2>
          <p>Previews explain the tools. Real proof must show the system producing the promised output.</p>
        </div>
        <div className="companionsPageSignal">
          <h2>One account</h2>
          <p>Your ILLCO account keeps access, purchase history, and support paths in one place.</p>
        </div>
      </section>

      {featuredReel ? (
        <section id="proof-videos" className="crazyReelSection" aria-label="ILLCO proof video highlights">
          <div className="crazyReelHeader">
            <div>
              <p className="companionsPageEyebrow">Demos and Proof</p>
              <h2>Separate previews from working proof</h2>
              <p>
                Watch examples for context, then request live working-output proof before buying a system.
              </p>
            </div>
            <a className="button primary" href="/commander#request">
              Request Live Proof
            </a>
          </div>

          <div className="crazyReelStage">
            <article className="crazyReelFeature">
              <div className="crazyReelVideoShell">
                <iframe
                  src={`${featuredReel.embedUrl}?rel=0&modestbranding=1`}
                  title={`${featuredReel.title} video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="crazyReelFeatureCopy">
                <span>{featuredReel.signal}</span>
                <h3>{featuredReel.title}</h3>
                <p>{featuredReel.caption}</p>
                <div className="crazyReelActions">
                  <a className="button primary" href={featuredReel.youtubeUrl} target="_blank" rel="noreferrer">
                    Watch
                  </a>
                  <a className="button secondary" href={featuredReel.moduleHref}>
                    Open Tool
                  </a>
                </div>
              </div>
            </article>

            <div className="crazyReelRail" aria-label="More highlight videos">
              {crazyReel.slice(1).map((item) => (
                <a className="crazyReelTile" href={item.youtubeUrl} target="_blank" rel="noreferrer" key={item.projectId}>
                  <span className="crazyReelThumb">
                    <img src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`} alt="" loading="lazy" />
                  </span>
                  <span className="crazyReelTileCopy">
                    <strong>{item.title}</strong>
                    <small>{item.signal}</small>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="companionsPageSignalStrip" aria-label="ILLCO Tools workspace status">
        <div className="companionsPageSignal">
          <h2>Lead follow-up</h2>
          <p>Use ILLCO systems to collect, qualify, and follow up with prospects without losing the thread.</p>
        </div>
        <div className="companionsPageSignal">
          <h2>Content production</h2>
          <p>Turn repeat content work into a guided production flow with proof, review, and delivery steps.</p>
        </div>
        <div className="companionsPageSignal">
          <h2>Workflow automation</h2>
          <p>Replace repetitive manual steps with focused AI tools and custom setup when needed.</p>
        </div>
      </section>

      <section className="panel companionsPagePanel">
        <div className="panelHeader">
          <div>
            <h2>ILLCO Tool Paths</h2>
            <p>Use these starting points to plan, collect records, produce content, or request a custom AI workflow.</p>
          </div>
        </div>
        <div className="companionsPageModuleGrid">
          {modules.map((module) => (
            <article
              id={module.id}
              className={`companionsPageModuleCard ${module.id === "think-for-me-mode" ? "isUserHelper" : ""}`}
              key={module.name}
            >
              <header className="companionsPageModuleHead">
                <h3>{module.name}</h3>
                <span className="companionsPageModuleStatus">{module.status}</span>
              </header>
              <p>{module.description}</p>
              {"prompt" in module ? (
                <div className="companionsPageHelperPrompt">
                  <span>Starter prompt</span>
                  <code>{module.prompt}</code>
                </div>
              ) : null}
              {"sdkView" in module ? (
                <div className="companionsPageSdkView" aria-label="OpenAI Agents SDK view">
                  <strong>OpenAI Agents SDK View</strong>
                  <p>{module.sdkView}</p>
                  <em>{module.redoCheck}</em>
                </div>
              ) : null}
              {"narrationView" in module ? (
                <div className="companionsPageNarrationView" aria-label="ElevenLabs narration view">
                  <strong>ElevenLabs Narration</strong>
                  <p>{module.narrationView}</p>
                  <em>{module.narrationCheck}</em>
                </div>
              ) : null}
              <div className="companionsPageModuleFoot">
                <span>{module.signal}</span>
                <a className="button secondary" href={module.href}>
                  {module.id === "think-for-me-mode" ? "Use Helper" : "Open"}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="all-apps" className="companionsAppDirectorySection">
        <div className="panelHeader">
          <div>
            <h2>Browse More Tools</h2>
            <p>The full product directory is available after the main offer, so first-time visitors can understand the value before comparing options.</p>
          </div>
          <div className="companionsAppDirectoryStats" aria-label="Commander app registry summary">
            <span>{products.length} tools</span>
            <span>{liveAppCount} ready</span>
            {masterAccess.unlocked ? <span>{masterAccess.unlockableProducts.length} unlocked</span> : null}
            <span>{categoryCount} categories</span>
          </div>
        </div>
        <div className="companionsAppPanelGrid">
          {appPanels.map((product) => (
            <AppPanel masterUnlocked={masterUnlockedProductIds.has(product.id)} product={product} key={product.id} />
          ))}
        </div>
      </section>
    </main>
  );
}

function AppPanel({ masterUnlocked, product }: { masterUnlocked: boolean; product: ProductRecord }) {
  const launchHref = getProductModuleHref(product.id);
  const completion = getProjectCompletionRecord(product.id);
  const isComplete = completion?.completionStatus === "complete";
  const unlockedHref = masterUnlocked ? launchHref : "";
  const publicLaunchHref = isPublicProductLaunchHref(launchHref) ? launchHref : "";
  const primaryHref = unlockedHref || publicLaunchHref || `/apps/${product.id}`;
  const primaryLabel = unlockedHref ? "Open Tool" : publicLaunchHref ? "Open Tool" : "Details";
  const sourceHref = getGithubSourceHref(completion);
  const secondaryHref = sourceHref || `/apps/${product.id}`;
  const secondaryLabel = sourceHref ? "Source" : "Details";
  const statusLabel = masterUnlocked || isComplete ? "Ready" : product.isLive ? "Available" : "Coming Soon";
  const categoryClassName = `category-${product.category}`;

  return (
    <article className={`companionsAppPanel ${categoryClassName} completion-${completion?.completionStatus || "missing-source"} ${product.isLive || product.id === "ai-companions-recovered" ? "isLive" : "isSetup"} ${masterUnlocked ? "isMasterUnlocked" : ""}`}>
      <header className="companionsAppPanelHeader">
        <div>
          <span>{categoryLabels[product.category]}</span>
          <h3>{product.displayName}</h3>
        </div>
        <strong>{statusLabel}</strong>
      </header>
      <dl className="companionsAppPanelFacts">
        <div>
          <dt>Tier</dt>
          <dd>{product.subscriptionTier}</dd>
        </div>
        <div>
          <dt>Access</dt>
          <dd>{masterUnlocked ? "Included" : formatLicenseMode(product.licenseMode)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{product.updated}</dd>
        </div>
        <div>
          <dt>Completion</dt>
          <dd>{sourceStatusLabel(completion?.sourceStatus)}</dd>
        </div>
      </dl>
      <div className="companionsAppPanelActions">
        <a className="button primary" href={primaryHref}>
          {primaryLabel}
        </a>
        <a className="button secondary" href={secondaryHref} target={secondaryHref.startsWith("http") ? "_blank" : undefined} rel={secondaryHref.startsWith("http") ? "noreferrer" : undefined}>
          {secondaryLabel}
        </a>
      </div>
    </article>
  );
}

function formatLicenseMode(mode: ProductRecord["licenseMode"]) {
  if (mode === "subscription") return "Monthly access";
  if (mode === "seat") return "Team access";
  if (mode === "usage") return "Pay as needed";
  return "Guided setup";
}

function getGithubSourceHref(completion: ReturnType<typeof getProjectCompletionRecord>) {
  return completion?.githubRepos[0]?.url || "";
}

function interleaveByCategory(productsToInterleave: FinishedProductRecord[]) {
  const categories = Object.keys(categoryRank) as ProductRecord["category"][];
  const buckets = categories.map((category) => productsToInterleave.filter((product) => product.category === category));
  const longestBucket = Math.max(0, ...buckets.map((bucket) => bucket.length));
  const interleaved: FinishedProductRecord[] = [];

  for (let index = 0; index < longestBucket; index += 1) {
    for (const bucket of buckets) {
      const product = bucket[index];
      if (product) interleaved.push(product);
    }
  }

  return interleaved;
}

function projectCompletionOwnersText() {
  return projectCompletionOwners.join(" and ");
}

function formatAuditTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function reelTitle(value: string) {
  return value
    .replace(/\bAI\b/g, "AI")
    .replace(/\bUAP\b/g, "UAP")
    .replace(/\bSora\b/g, "Sora");
}

function reelSignal(projectId: string) {
  const signals: Record<string, string> = {
    "sora-vault-cloud": "Sora vault energy",
    "illco-ai-video": "AI video engine",
    "rap-lyric-generator": "Rap workflow chaos",
    "visual-voice-board": "Voice control board",
    "uap-ai-lab": "UAP research lab",
    "mastering-studio-platform": "Before/after proof",
  };
  return signals[projectId] || "Wild build";
}

function reelCaption(projectId: string) {
  const captions: Record<string, string> = {
    "sora-vault-cloud": "The catalog brain for high-volume Sora work, built to make generated video searchable, usable, and production-ready.",
    "illco-ai-video": "The AI video workstation lane: prompts, footage, and editing systems pushing toward full-stack media production.",
    "rap-lyric-generator": "A creative engine for punchy lyrics and content concepts, made for fast ideation and artist-style workflows.",
    "visual-voice-board": "A voice and visual coordination surface built for controlling media ideas without losing creative context.",
    "uap-ai-lab": "A cinematic research workspace that turns strange files, sightings, and analysis loops into a working investigation surface.",
    "mastering-studio-platform": "Proof that the system can show real output, not just screenshots: source audio, processed result, and a finished delivery path.",
  };
  return captions[projectId] || "One of the stranger ILLCO builds, pulled forward as front-page proof.";
}
