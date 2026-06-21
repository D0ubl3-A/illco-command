import { demoVideos } from "@/lib/demo-videos";
import { products, type ProductRecord } from "@/lib/deployments";
import { CheckoutProductsSection } from "@/components/checkout-products-section";
import { ComingSoonCountdown } from "@/components/coming-soon-countdown";
import { MasterAccessPanel } from "@/components/master-access-panel";
import { readMasterAccessSession } from "@/lib/master-access";
import { getProductModuleHref } from "@/lib/product-routes";
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
      status: "Locked",
      signal: "Separated product",
      description: "Guided onboarding chat that captures goals, timeline, and business context before routing to the right workflow.",
      href: "/apps/ai-companion-conversational-intake"
    },
    {
      id: "ai-companion-prompt-studio",
      name: "Prompt Studio",
      status: "Locked",
      signal: "Separated product",
      description: "Structured prompt composer for repeatable campaigns, automation jobs, and specialist-agent handoffs.",
      href: "/apps/ai-companion-prompt-studio"
    },
    {
      id: "ai-companion-content-production",
      name: "Content Production",
      status: "Locked",
      signal: "Gemini video paused",
      description: "End-to-end content path for long-form walkthroughs, narrated outputs, and distribution-ready variants.",
      href: "/apps/ai-companion-content-production"
    },
    {
      id: "ai-companion-sales-agent-handoff",
      name: "Sales Agent Hand-off",
      status: "Locked",
      signal: "Separated product",
      description: "Visitor qualification and routing to service requests through the embedded customer sales agent.",
      href: "/apps/ai-companion-sales-agent-handoff"
    },
    {
      id: "ai-companion-command-routing",
      name: "Multi-App Command Routing",
      status: "Locked",
      signal: "Separated product",
      description: "Unified launcher across all products with account-linked context and consistent purchase-access journeys.",
      href: "/apps/ai-companion-command-routing"
    },
    {
      id: "ai-companion-workspace-access",
      name: "Unified Workspace Access",
      status: "Locked",
      signal: "Separated product",
      description: "Shared account center for profile, session, and app access while monetization and safety gates stay centralized.",
      href: "/apps/ai-companion-workspace-access"
    }
  ] as const;

  return (
    <div className="appLandingWorkspace companionsPageWorkspace">
      <section className="appLandingHero heroPanel companionsPageHero">
        <div className="heroCopy companionsPageHeroCopy">
          <p className="companionsPageEyebrow">ILLCO Command</p>
          <h1>ILLCO Tools</h1>
          <p>
            The main tools workspace for account access, app routing, proof videos, and shipped ILLCO systems.
          </p>
          <div className="heroProofBadges" aria-label="ILLCO Tools launch status">
            <span><strong>{liveAppCount}</strong> in-app modules</span>
            <span><strong>{categoryCount}</strong> groups</span>
            <span><strong>{crazyReel.length}</strong> proof videos</span>
          </div>
        </div>
        <div className="commanderCinema" aria-hidden="true">
          <div className="commanderCinemaChrome">
            <span className="commanderCinemaLive">
              <span />
              Live command surface
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
          <a className="button primary" href="/account">Login / Account</a>
          <a className="button secondary" href="/admin">Admin</a>
          <a className="button primary" href="/commander#request">Request AI System</a>
          <a className="button primary" href="#checkout-products">Check Out Products</a>
          <a className="button secondary" href="#all-apps">Explore All Apps</a>
          <a className="button secondary" href="/apps/ai-companions-recovered">Open Product Page</a>
          <a className="button secondary" href={toolsLaunchUrl}>
            Open Illco Tools
          </a>
        </div>
      </section>

      <ComingSoonCountdown targetIso="2026-05-25T09:00:00-07:00" />

      <MasterAccessPanel compact />

      <CheckoutProductsSection />

      <section className="connectedAppsSection" aria-label="Connected finished ILLCO apps">
        <div className="connectedAppsHeader">
          <div>
            <p className="companionsPageEyebrow">Connected App System</p>
            <h2>Finished apps wired into one Commander</h2>
            <p>
              Only apps that pass the completion gate appear in this launch network: healthy production URL plus source found locally or on GitHub.
            </p>
          </div>
          <div className="connectedAppsHeaderActions">
            <a className="button primary" href="#all-apps">Open App Panels</a>
            <a className="button secondary" href="/account">Account Center</a>
          </div>
        </div>

        <div className="connectedAppsMap">
          <div className="connectedAppsCore" aria-label="ILLCO Command core">
            <span>ILLCO</span>
            <strong>Command</strong>
            <small>{completeProductionApps.length} completed apps</small>
          </div>
          <div className="connectedAppsStats" aria-label="Connected app registry summary">
            <span>{completeProductionApps.length} complete</span>
            <span>{productionNeedsWork} live repair queue</span>
            <span>{projectCompletionSummary.needsDeploy} need deploy</span>
            <span>{finishedAppCategories} app groups</span>
          </div>
          <div className="connectedAppsNodes">
            {connectedApps.map((product) => {
              const completion = getProjectCompletionRecord(product.id);
              const completionClassName = completion?.completionStatus || "missing-source";
              return (
                <a
                  className={`connectedAppNode category-${product.category} completion-${completionClassName}`}
                  href={getProductModuleHref(product.id)}
                  key={product.id}
                >
                  <span>{categoryLabels[product.category]}</span>
                  <strong>{product.displayName}</strong>
                  <small>{product.subscriptionTier} / {formatLicenseMode(product.licenseMode)} / {sourceStatusLabel(completion?.sourceStatus)}</small>
                  <em>{completionStatusLabel(completion?.completionStatus)}</em>
                </a>
              );
            })}
          </div>
          <p className="connectedAppsAuditStamp">
            Source audit checked local projects and GitHub owners {projectCompletionOwnersText()} on {formatAuditTimestamp(projectCompletionGeneratedAt)}.
          </p>
        </div>
      </section>

      <section className="completionQueueSection" aria-label="ILLCO app completion queue">
        <div className="completionQueueHeader">
          <div>
            <p className="companionsPageEyebrow">Completion Queue</p>
            <h2>Apps to repair, source, or deploy</h2>
            <p>
              These records stay out of the finished launch network until they pass the same production health and source ownership checks.
            </p>
          </div>
          <div className="completionQueueStats">
            <span>{projectCompletionSummary.needsRepair} repair</span>
            <span>{projectCompletionSummary.needsSource} find source</span>
            <span>{projectCompletionSummary.needsDeploy} deploy</span>
            <span>{projectCompletionSummary.missingSource} missing</span>
          </div>
        </div>
        <div className="completionQueueGrid">
          {completionQueue.map((product) => {
            const completion = getProjectCompletionRecord(product.id);
            const sourceHref = getGithubSourceHref(completion);
            const moduleHref = getProductModuleHref(product.id);
            return (
              <article className={`completionQueueItem completion-${completion?.completionStatus || "missing-source"}`} key={product.id}>
                <span>{completionStatusLabel(completion?.completionStatus)}</span>
                <strong>{product.displayName}</strong>
                <small>{sourceStatusLabel(completion?.sourceStatus)} / {completion?.health?.status || "not checked"}</small>
                <div className="completionQueueActions">
                  <a href={`/apps/${product.id}`}>Details</a>
                  <a href={moduleHref}>Module</a>
                  {sourceHref ? (
                    <a href={sourceHref} target="_blank" rel="noreferrer">
                      Source
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {featuredReel ? (
        <section className="crazyReelSection" aria-label="Craziest ILLCO video highlights">
          <div className="crazyReelHeader">
            <div>
              <p className="companionsPageEyebrow">Front Page Highlight Reel</p>
              <h2>Craziest Builds on Deck</h2>
              <p>
                A fast proof wall of our wildest shipped systems: Sora vaults, AI video tools, rap workflows, voice boards, UAP labs, and mastering proof.
              </p>
            </div>
            <a className="button primary" href="/commander#apps">
              Open App Arsenal
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
                    Open Module
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
          <h2>Customer-safe funnel</h2>
          <p>Customers use Login / Account. Operators use Admin, guarded by the configured admin session and operator key.</p>
        </div>
        <div className="companionsPageSignal">
          <h2>Payments synchronized</h2>
          <p>Subscription and checkout paths stay centralized so customers move through one consistent purchase flow.</p>
        </div>
        <div className="companionsPageSignal">
          <h2>Apps in one shell</h2>
          <p>Tool modules and app routing share the same account context to reduce friction across products.</p>
        </div>
      </section>

      <section className="panel companionsPagePanel">
        <div className="panelHeader">
          <div>
            <h2>ILLCO Tools Modules</h2>
            <p>Each module routes into the same account and monetization surface so customers can move across tools without context loss.</p>
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
                  {module.id === "think-for-me-mode" ? "Use Helper" : "Review Product"}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="all-apps" className="companionsAppDirectorySection">
        <div className="panelHeader">
          <div>
            <h2>ILLCO App Panels</h2>
            <p>Every app in the Commander catalog, generated from the live product registry.</p>
          </div>
          <div className="companionsAppDirectoryStats" aria-label="Commander app registry summary">
            <span>{products.length} apps</span>
            <span>{liveAppCount} live</span>
            {masterAccess.unlocked ? <span>{masterAccess.unlockableProducts.length} unlocked</span> : null}
            <span>{categoryCount} groups</span>
          </div>
        </div>
        <div className="companionsAppPanelGrid">
          {appPanels.map((product) => (
            <AppPanel masterUnlocked={masterUnlockedProductIds.has(product.id)} product={product} key={product.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AppPanel({ masterUnlocked, product }: { masterUnlocked: boolean; product: ProductRecord }) {
  const launchHref = getProductModuleHref(product.id);
  const completion = getProjectCompletionRecord(product.id);
  const isComplete = completion?.completionStatus === "complete";
  const unlockedHref = masterUnlocked ? launchHref : "";
  const primaryHref = unlockedHref || (isComplete ? launchHref : getProductModuleHref(product.id));
  const primaryLabel = unlockedHref ? "Open Unlocked Module" : isComplete ? "Open Module" : "Review";
  const sourceHref = getGithubSourceHref(completion);
  const secondaryHref = sourceHref || `/apps/${product.id}`;
  const secondaryLabel = sourceHref ? "Source" : "Details";
  const statusLabel = masterUnlocked ? "Unlocked" : completionStatusLabel(completion?.completionStatus);
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
          <dd>{masterUnlocked ? "Master" : formatLicenseMode(product.licenseMode)}</dd>
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
  if (mode === "subscription") return "Subscription";
  if (mode === "seat") return "Seat";
  if (mode === "usage") return "Usage";
  return "Internal";
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
