import type { Metadata } from "next";

import { LyricVideoForgeClient } from "@/components/lyric-video-forge-client";

export const metadata: Metadata = {
  title: "Lyric Video Forge",
  description:
    "OpenAI Agent SDK powered ILLCO workflow for turning songs, artist locks, transcript timing, ASS subtitle rules, and render QC into production-ready lyric video runs.",
  openGraph: {
    title: "Lyric Video Forge | ILLCO AI",
    description:
      "OpenAI Agent SDK powered ILLCO workflow for turning songs, artist locks, transcript timing, ASS subtitle rules, and render QC into production-ready lyric video runs.",
    url: "/tools/lyric-video-forge",
    type: "website",
    images: [
      {
        url: "/images/lyric-video-forge-credits.png",
        width: 1600,
        height: 900,
        alt: "Lyric Video Forge product thumbnail",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lyric Video Forge | ILLCO AI",
    description:
      "OpenAI Agent SDK powered ILLCO workflow for turning songs, artist locks, transcript timing, ASS subtitle rules, and render QC into production-ready lyric video runs.",
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
            <span className="brandGlyph">IC</span>
            <strong>ILLCO Tools</strong>
          </a>
          <div>
            <a className="button secondary" href="/tools">Back to Tools</a>
            <a className="button secondary" href="/account">Account</a>
            <a className="button primary" href="#forge">Open Forge</a>
          </div>
        </nav>

        <section className="panel bigoStrategyHero">
          <div>
            <span className="readinessPill ready">Agent SDK workflow</span>
            <h1>Lyric Video Forge</h1>
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

        <LyricVideoForgeClient />
      </div>
    </div>
  );
}


