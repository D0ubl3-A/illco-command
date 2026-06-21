import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckoutProductsSection } from "@/components/checkout-products-section";
import { LeadCaptureForm } from "@/components/lead-capture-form";
import {
  categoryLabels,
  customerProductName,
  getAppFunnelState,
  getAppLandingProduct,
  getPrimaryAppVideo,
  planNames,
} from "@/lib/app-funnel";
import { isMasterAccessUnlocked, isMasterUnlockableProduct } from "@/lib/master-access";
import { getProductListingKicker, getProductViralImagePath } from "@/lib/product-marketing";
import { getProductNotice } from "@/lib/product-notices";
import { type ProductRecord } from "@/lib/deployments";

type AppLandingPageProps = {
  params: Promise<{ productId: string }>;
};

const barzStudioProductIds = [
  "ai-music-mastering-pro",
  "rap-lyric-generator",
  "song-analyzer-deploy",
  "vault-select-exclusive-trap-beat",
  "barz-beat-shop",
  "cinematic-ai-music-video-production",
  "full-hd-lyric-videos",
  "youtube-rank-revival-ai-pro",
  "testimonial-to-marketing-asset-generator",
  "viral-stitch-ai",
];

const illcoAiVideoShowcase = [
  {
    src: "/media/sora-showcase/sora-razor-cut-music-edit.mp4",
    label: "Razor-cut music edit",
    note: "Fast visual rhythm for song promo edits.",
  },
  {
    src: "/media/sora-showcase/sora-music-video-techno.mp4",
    label: "Techno music-video look",
    note: "Sora-generated motion concept for a music release.",
  },
  {
    src: "/media/sora-showcase/sora-music-video-techno-alt.mp4",
    label: "Alternate music visual",
    note: "Second local Sora pass for creative direction.",
  },
];

const appLandingProcessByCategory: Record<ProductRecord["category"], string[]> = {
  command: [
    "Open the app and confirm the active module state.",
    "Choose one user-facing goal and input source.",
    "Run the first validation pass for setup and access.",
    "Review results against expected output and safety checks.",
    "Share next steps with the team in one short handoff.",
  ],
  media: [
    "Load the source assets and brief.",
    "Set the output format, quality target, and destination.",
    "Generate or edit until the first pass passes review.",
    "Export with metadata and delivery notes.",
    "Distribute or handoff the final output to next step.",
  ],
  automation: [
    "Collect trigger inputs and desired result fields.",
    "Define owners, escalation, and failure handling.",
    "Connect channels and validate each integration.",
    "Run the workflow once with sample traffic.",
    "Review logs and adjust rules for reliability.",
  ],
  commerce: [
    "Define offer, price, and checkout journey.",
    "Run a test purchase or lead funnel path.",
    "Confirm payment, confirmation, and receipt generation.",
    "Validate post-purchase automation and notifications.",
    "Measure close rate, objections, and completion.",
  ],
  realEstate: [
    "Collect the listing or service input with context.",
    "Assign lead source, owner, and required follow-ups.",
    "Schedule tours or discovery steps and track status.",
    "Deliver documents and communication in one lane.",
    "Close, recycle, or escalate each opportunity.",
  ],
  backend: [
    "Map required endpoint shape and error contracts.",
    "Connect secrets, permissions, and auth checks.",
    "Validate payloads through healthy request flows.",
    "Monitor response behavior and retry paths.",
    "Ship fixes with clear rollback and test evidence.",
  ],
  experimental: [
    "Define hypothesis and measurable success criterion.",
    "Build a minimal test path with explicit limits.",
    "Collect feedback and document known limitations.",
    "Run acceptance checks and log failures.",
    "Iterate quickly and harden only proven paths.",
  ],
};

function getAppLandingProcess(product: ProductRecord) {
  return appLandingProcessByCategory[product.category];
}

export async function generateMetadata({ params }: AppLandingPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = getAppLandingProduct(productId);
  if (!product) return {};
  const state = getAppFunnelState(product);
  const productName = customerProductName(product);
  const image = getProductViralImagePath(product);
  const url = `/apps/${product.id}`;

  return {
    title: `${productName} Product Listing`,
    description: `${state.summary} Status: ${state.statusLabel}.`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${productName} | ILLCO AI`,
      description: state.summary,
      url,
      type: "website",
      images: image ? [{ url: image, width: 1600, height: 900, alt: `${productName} product image` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${productName} | ILLCO AI`,
      description: state.summary,
      images: image ? [image] : undefined,
    },
  };
}

export default async function AppLandingPage({ params }: AppLandingPageProps) {
  const { productId } = await params;
  const product = getAppLandingProduct(productId);
  if (!product) notFound();

  const state = getAppFunnelState(product);
  const video = getPrimaryAppVideo(product.id);
  const category = categoryLabels[product.category];
  const productName = customerProductName(product);
  const masterUnlocked = (await isMasterAccessUnlocked()) && isMasterUnlockableProduct(product.id);
  const isBarzStudio = product.id === "barz-web-studio";
  const isIllcoAiVideo = product.id === "illco-ai-video";
  const productHeroImage = getProductViralImagePath(product);
  const listingKicker = getProductListingKicker(product);
  const productNotice = getProductNotice(product.id);
  const moduleTarget = state.safeUrl?.startsWith("http") ? "_blank" : undefined;
  const landingHref = `/apps/${encodeURIComponent(product.id)}`;
  const hasSeparateProductHref = Boolean((masterUnlocked || state.canOpen) && state.safeUrl && state.safeUrl !== landingHref);
  const processSteps = getAppLandingProcess(product);

  return (
    <div className="fallbackPage appLandingPage">
      <div className="workspace appLandingWorkspace">
        <nav className="appLandingNav" aria-label="App landing navigation">
          <a className="brandBlock" href="/">
            <span className="brandGlyph">IC</span>
            <strong>ILLCO Command</strong>
          </a>
          <div>
            <a className="button secondary" href="/#apps">All Modules</a>
            <a className="button secondary" href="#checkout-products">Products</a>
            <a className="button secondary" href="/#services">Services</a>
            <a className="button primary" href="#request">Request Setup</a>
          </div>
        </nav>

        <section className="panel appLandingHero">
          <div className="appLandingCopy">
            <span className={`readinessPill ${masterUnlocked ? "ready" : state.status === "soon" ? "pending" : state.status === "setup" ? "neutral" : "ready"}`}>
              {masterUnlocked ? "Master unlocked" : state.statusLabel}
            </span>
            <h1>{productName}</h1>
            <strong className="appLandingKicker">{listingKicker}</strong>
            <p>{state.title}. {state.summary}</p>
            {productNotice ? (
              <aside className="activationNotice" aria-label={`${productName} activation notice`}>
                <span>Activation notice</span>
                <strong>{productNotice.title}</strong>
                <p>{productNotice.body}</p>
                <em>{productNotice.meta}</em>
              </aside>
            ) : null}
            <div className="appLandingActions">
              {masterUnlocked && state.safeUrl ? (
                <a className="button primary" href={state.safeUrl} target={moduleTarget} rel={moduleTarget ? "noreferrer" : undefined}>
                  Open Unlocked Module
                </a>
              ) : state.canCheckout ? (
                <form action="/api/subscriptions/checkout" method="post" className="inlineCheckoutForm">
                  <input type="hidden" name="planId" value={state.planId} />
                  <input type="hidden" name="productId" value={product.id} />
                  <button className="button primary" type="submit">Start Subscription</button>
                </form>
              ) : (
                <a className="button primary" href="#request">Request Setup</a>
              )}
              {hasSeparateProductHref && state.safeUrl ? (
                <a className="button secondary" href={state.safeUrl} target={moduleTarget} rel={moduleTarget ? "noreferrer" : undefined}>Open Product</a>
              ) : null}
              {video?.youtubeUrl ? (
                <a className="button secondary" href={video.youtubeUrl} target="_blank" rel="noreferrer">
                  {video.mode === "full-walkthrough" ? "Watch Full Tutorial" : "Watch Proof"}
                </a>
              ) : null}
            </div>
          </div>
          <div className="appLandingSide">
            {isIllcoAiVideo ? (
              <div className="appLandingVideoShowcase" aria-label="Local Sora music video showcase">
                <div className="appLandingVideoFrame">
                  <video
                    src={illcoAiVideoShowcase[0].src}
                    poster={productHeroImage || undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                    preload="metadata"
                  />
                  <div className="appLandingVideoCaption">
                    <span>Local Sora clip</span>
                    <strong>{illcoAiVideoShowcase[0].label}</strong>
                  </div>
                </div>
                <div className="soraClipRail">
                  {illcoAiVideoShowcase.slice(1).map((clip) => (
                    <article className="soraClipCard" key={clip.src}>
                      <video src={clip.src} muted loop playsInline controls preload="metadata" />
                      <div>
                        <strong>{clip.label}</strong>
                        <span>{clip.note}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : productHeroImage ? (
              <div className="appLandingProductImage">
                <img src={productHeroImage} alt={`${productName} product preview`} />
              </div>
            ) : null}
            <div className="appLandingFacts">
              <Fact label="Category" value={category} tone="neutral" />
              <Fact label="Plan" value={planNames[state.planId]} tone="neutral" />
              <Fact label="Access" value={masterUnlocked ? "Master unlocked" : state.accessLabel} tone={masterUnlocked || state.canCheckout ? "good" : "neutral"} />
              <Fact label="Proof" value={state.proofLabel} tone={video ? "good" : "warn"} />
            </div>
          </div>
        </section>

        {isBarzStudio ? (
          <CheckoutProductsSection
            productIds={barzStudioProductIds}
            eyebrow="Studio Media Package"
            title="Barz Web Studio Package"
            description="One focused music and media stack for artists: lyrics, song analysis, mastering, beat purchase, lyric videos, cinematic music videos, YouTube revival, proof assets, and Viral Stitch."
          />
        ) : (
          <CheckoutProductsSection />
        )}

        <section className="appLandingGrid">
          <article className="panel appLandingCard">
            <div className="panelHeader">
              <div>
                <h2>Why this app exists</h2>
                <p>Each app landing page gives buyers a clean decision path with proof, access guidance, and a next best action.</p>
              </div>
            </div>
            <div className="appValueStack">
              <ValueItem title="Workflow focus" copy={`Built for the ${category.toLowerCase()} lane inside the ILLCO app catalog.`} />
              <ValueItem title="Customer-safe access" copy={state.canCheckout ? "Self-serve checkout is available because the app, proof, and plan gates pass." : "Guided setup keeps access clean until the right package is confirmed."} />
              <ValueItem title="Proof-led buying" copy={video ? "A proof or tutorial link is available before buyers commit." : "A setup request is the right next step while proof is prepared."} />
            </div>
          </article>

          <article className="panel appLandingCard">
            <div className="panelHeader">
              <div>
                <h2>Proof and walkthrough</h2>
                <p>Full tutorials are prioritized when they include slower pacing, narration, highlights, and captions.</p>
              </div>
            </div>
            {video?.embedUrl ? (
              <div className="appVideoFrame">
                <iframe
                  title={`${productName} walkthrough`}
                  src={`${video.embedUrl}?rel=0`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="accountNote">
                <strong>Tutorial pending</strong>
                <span>Request setup for a guided walkthrough and access details.</span>
              </div>
            )}
          </article>

          <article className="panel appLandingCard">
            <div className="panelHeader">
              <div>
                <h2>Suggested process</h2>
                <p>Use this default operating path when setting up and testing this app.</p>
              </div>
            </div>
            <div className="accountNote">
              <ol>
                {processSteps.map((step, index) => (
                  <li key={`${product.id}-process-${index}`}>{step}</li>
                ))}
              </ol>
            </div>
          </article>
        </section>

        <section id="request" className="panel appLandingRequest">
          <div className="panelHeader">
            <div>
              <h2>Request {productName}</h2>
              <p>Tell us what you want handled first. We will route it to the right app, service package, or enterprise setup.</p>
            </div>
          </div>
          <LeadCaptureForm
            serviceId={state.canCheckout ? state.planId : `app-${product.id}`}
            productName={productName}
            buttonLabel={state.canCheckout ? "Ask Before Subscribing" : "Request Setup"}
          />
        </section>
      </div>
    </div>
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

function ValueItem({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="accountNote">
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  );
}
