import type { Metadata } from "next";

import { LyricVideoForgeClient } from "@/components/lyric-video-forge-client";

const pageTitle = "Lyric Video Forge — AI Lyric Timing & Video Workflow";
const pageDescription =
  "Plan lyric videos with iLLCo AI: review song transcription, time captions, prepare ASS subtitles, choose reference visuals, and check export quality. Explore the separate MP4 renderer.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://illcoai.tech/tools/lyric-video-forge",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://illcoai.tech/tools/lyric-video-forge",
    type: "website",
    images: [
      {
        url: "/images/lyric-video-forge-credits.png",
        width: 1600,
        height: 900,
        alt: "Lyric Video Forge caption and timing workflow preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/lyric-video-forge-credits.png"],
  },
};

export const dynamic = "force-dynamic";

export default function LyricVideoForgePage() {
  return (
    <div className="fallbackPage appLandingPage">
      <div className="workspace appLandingWorkspace bigoStrategyWorkspace">
        <nav className="appLandingNav" aria-label="Lyric Video Forge navigation">
          <a className="brandBlock" href="/tools">
            <img src="/brand/illco-command-logo.png" alt="ILLCO Command" style={{ width: 42, height: 42, borderRadius: 8, objectFit: "contain" }} />
            <strong>ILLCO Tools</strong>
          </a>
          <div className="appLandingNavLinks">
            <a className="button secondary" href="/tools">Back</a>
            <a className="button secondary" href="/account">Account</a>
            <a className="button primary" href="#forge">Open Forge</a>
          </div>
        </nav>

        <section className="panel bigoStrategyHero">
          <div>
            <span className="readinessPill ready">Agent SDK workflow</span>
            <h1>Lyric Video Forge: AI Lyric Video Timing Workflow</h1>
            <p>
              Build ILLCO-ready lyric video runs from uploaded audio, uploaded character references, Realtime-first transcription, user-approved lyrics, selected image counts, dissolve visuals, readable ASS subtitles, strict rhyme coloring, and FFmpeg QC notes.
            </p>
            <div className="heroProofBadges" aria-label="Lyric video forge system">
              <span><strong>Agent SDK</strong> production brief</span>
              <span><strong>Credits</strong> usage metering</span>
              <span><strong>Upload</strong> audio + reference</span>
              <span><strong>ChatGPT App</strong> MCP endpoint</span>
            </div>
          </div>
          <div className="bigoStrategyCommandCard">
            <span>Default lane</span>
            <strong>M3ntally-iLL lyric videos with timing discipline</strong>
            <p>Transcribe first, confirm lyrics, generate only the credit-selected image count, then cross-dissolve the visuals. No fake exact-sync claims.</p>
          </div>
        </section>

        <section className="bigoStrategyGrid">
          <article className="panel bigoStrategyStep">
            <span>Step 1</span>
            <h2>Upload Audio + Character</h2>
            <p>Audio is required for transcription. Character reference is required before image generation so identity stays locked.</p>
          </article>
          <article className="panel bigoStrategyStep">
            <span>Step 2</span>
            <h2>Transcribe + Confirm Lyrics</h2>
            <p>The app uses a rap-specialist transcription prompt and blocks image generation until the user confirms the lyrics are correct.</p>
          </article>
          <article className="panel bigoStrategyStep">
            <span>Step 3</span>
            <h2>Generate Images + Dissolve</h2>
            <p>The selected image count controls credit use. Generated stills are dissolved together instead of hard-cut.</p>
          </article>
        </section>

        <section className="panel bigoStrategyStep" aria-labelledby="lyric-video-choices">
          <h2 id="lyric-video-choices">Choose the lyric-video workflow that matches your release</h2>
          <p>
            This tool supports the production-planning workflow: transcribing a song, checking the
            actual words, preparing and timing ASS captions, choosing approved visuals, and reviewing
            render requirements. Review lyrics and timing before releasing a video.
          </p>
          <p>
            Need a downloadable MP4 rather than a production brief? The separate Lyric Video Forge
            product listing describes the current browser renderer, supported resolution, pricing,
            input files, and limitations. Check those terms before purchasing.
          </p>
          <a
            className="button primary"
            href="https://illcoai.tech/products/lyric-video-forge"
          >
            Review current lyric-video MP4 renderer and pricing
          </a>
        </section>

        <LyricVideoForgeClient />
      </div>
    </div>
  );
}


