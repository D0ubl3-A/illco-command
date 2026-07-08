import type { Metadata } from "next";

import { CheckoutProductsSection } from "@/components/checkout-products-section";

export const metadata: Metadata = {
  title: "Get A Lyric Video That Looks Expensive | ILLCOCOMMAND",
  description:
    "Ad landing page for artists and creators who need a finished Full HD lyric video, synced lyrics, visual direction, and a clear checkout path.",
  openGraph: {
    title: "Get A Lyric Video That Looks Expensive | ILLCOCOMMAND",
    description:
      "Turn a song into a finished Full HD lyric video with timing, visuals, censor controls, and ILLCOCOMMAND production workflow.",
    url: "/ads/lyric-video-forge",
    type: "website",
    images: [
      {
        url: "/images/lyric-video-forge-credits.png",
        width: 1600,
        height: 900,
        alt: "Lyric Video Forge product preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Get A Lyric Video That Looks Expensive | ILLCOCOMMAND",
    description:
      "Turn a song into a finished Full HD lyric video with synced lyrics, visual direction, and checkout inside ILLCOCOMMAND.",
    images: ["/images/lyric-video-forge-credits.png"],
  },
};

export default function LyricVideoForgeAdPage() {
  const proofVideoUrl = "/media/illco-flyover-cutout-optimized.mp4";

  return (
    <main className="lyricAdPage">
      <section className="lyricAdHero" aria-label="Lyric video ad landing hero">
        <div className="lyricAdHeroCopy">
          <p className="lyricAdEyebrow">ILLCOCOMMAND for artists</p>
          <h1>Your song needs a video that makes people stop scrolling.</h1>
          <p>
            Start with a 1-day trial that covers up to 2 Full HD lyric videos. Send the track, lock the lyrics, and get synced words, sharp visual direction, and export-ready polish for YouTube, reels, and release promo.
          </p>
          <div className="lyricAdActions">
            <a className="button primary" href="#checkout-products">Get My Lyric Video</a>
            <a className="button secondary" href="/tools/lyric-video-forge">Open The Forge</a>
          </div>
          <div className="lyricAdProof" aria-label="Offer proof points">
            <span><strong>1 day</strong> trial access</span>
            <span><strong>2 videos</strong> included limit</span>
            <span><strong>Full HD</strong> export lane</span>
            <span><strong>Synced</strong> lyric timing</span>
            <span><strong>Censored</strong> or raw lyric display</span>
            <span><strong>ILLCOCOMMAND</strong> login + payment sync</span>
          </div>
        </div>

        <div className="lyricAdPoster" aria-hidden="true">
          <div className="lyricAdPhone">
            <img src="/images/lyric-video-forge-credits.png" alt="" />
            <div>
              <span>Master Lyric</span>
              <strong>Style presets. Timing control. Visual FX.</strong>
            </div>
          </div>
          <div className="lyricAdFloatingCue cueOne">Lyrics hit on beat</div>
          <div className="lyricAdFloatingCue cueTwo">Cleaner than a static cover</div>
          <div className="lyricAdFloatingCue cueThree">Built inside ILLCOCOMMAND</div>
        </div>
      </section>

      <section className="lyricAdPainSection" aria-label="Why artists need the product">
        <article>
          <span>Problem</span>
          <h2>Most songs die because the visual is lazy.</h2>
          <p>A plain upload gives people nothing to watch. A weak lyric video makes the song feel smaller than it is.</p>
        </article>
        <article>
          <span>Fix</span>
          <h2>Give the track a visual engine.</h2>
          <p>Synced words, cinematic mood, controlled censoring, and style presets make the release feel intentional.</p>
        </article>
        <article>
          <span>Close</span>
          <h2>One page. One action.</h2>
          <p>The ad lands here, the buyer understands the offer, and checkout points directly to the lyric video product.</p>
        </article>
      </section>

      <section className="lyricAdDemoBand" aria-label="What the lyric video includes">
        <div>
          <p className="lyricAdEyebrow">What they get</p>
          <h2>A release asset, not a throwaway visualizer.</h2>
        </div>
        <div className="lyricAdFeatureGrid">
          <span>Timed lyric review</span>
          <span>Visual direction pass</span>
          <span>Artist reference handling</span>
          <span>Censored / uncensored switch</span>
          <span>FX and font styling</span>
          <span>Export-ready delivery</span>
        </div>
      </section>

      <section className="lyricAdPlatformClose" aria-label="Fast ILLCOCOMMAND checkout">
        <div>
          <p className="lyricAdEyebrow">Fast sale path</p>
          <h2>1-day trial. 2 videos. Login and payment sync automatically.</h2>
          <p>
            Checkout is tied to the ILLCOCOMMAND account flow. Stripe starts a 1-day trial, the offer covers 2 lyric videos, and account return, product access, and the Forge workspace stay connected instead of sending buyers through a loose one-off page.
          </p>
        </div>
        <div className="lyricAdPlatformSteps">
          <span><strong>1</strong> Start the 1-day trial</span>
          <span><strong>2</strong> Use the 2-video lyric limit</span>
          <span><strong>3</strong> Login and payment sync to ILLCOCOMMAND</span>
          <span><strong>4</strong> Open Lyric Video Forge and start the run</span>
        </div>
      </section>

      <section className="lyricAdProofStage" aria-label="Finished lyric video proof">
        <div className="lyricAdProofCopy">
          <p className="lyricAdEyebrow">Real output proof</p>
          <h2>Watch the kind of finished asset this funnel sells.</h2>
          <p>
            This is the proof layer that keeps ad traffic from bouncing: a finished lyric-video output, not a promise or a mockup.
          </p>
          <a className="button secondary" href={proofVideoUrl} target="_blank" rel="noreferrer">
            Open Proof Video
          </a>
        </div>
        <div className="lyricAdProofVideo" style={{ position: "relative" }}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: "10px",
              top: "10px",
              zIndex: 2,
              background: "rgba(0,0,0,0.55)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "0.04em",
              padding: "4px 8px",
              borderRadius: "999px",
              textShadow: "0 0 8px rgba(0,0,0,0.9)",
              border: "1px solid rgba(255,255,255,0.35)",
              pointerEvents: "none",
            }}
          >
            Video Forge iLLCoAI.Tech
          </div>
          <video controls playsInline preload="metadata" style={{ position: "relative", zIndex: 1 }}>
            <source src={proofVideoUrl} type="video/mp4" />
          </video>
        </div>
      </section>

      <CheckoutProductsSection
        productIds={["full-hd-lyric-videos"]}
        eyebrow="ILLCOCOMMAND Checkout"
        title="Get The Full HD Lyric Video"
        description="Fast checkout for ad traffic. The 1-day trial includes a 2-video limit, payment syncs to the ILLCOCOMMAND account flow, and buyers return to the Lyric Video Forge workspace."
      />

      <section className="lyricAdFinal" aria-label="Final lyric video call to action">
        <div>
          <p className="lyricAdEyebrow">Stop losing release momentum</p>
          <h2>Make the song look like it deserves attention.</h2>
        </div>
        <a className="button primary" href="#checkout-products">Get The Lyric Video</a>
      </section>
    </main>
  );
}
