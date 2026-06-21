import type { Metadata } from "next";

import { CopyPromptBlock } from "@/components/copy-prompt-block";
import { canDirectCheckoutPublicProduct } from "@/lib/public-checkout";
import { getProductAccess } from "@/lib/product-access";
import { thinkForMeSkillMarkdown } from "@/lib/think-for-me-skill";

export const metadata: Metadata = {
  title: "Think For Me Mode",
  description:
    "A beginner-safe ILLCO helper for goals, Plan Mode, CLI execution, OpenAI Agents SDK decisions, and ElevenLabs narration checks.",
};

export const dynamic = "force-dynamic";

const productId = "think-for-me-mode";
const productPlanId = "studio";
const productReturnTo = "/tools/think-for-me-mode";

const starterPrompt =
  "Create a goal for this project. Use Plan Mode first. Keep it simple. Assume most work should run through the CLI. Tell me the first small step, the command to run, and how we verify it.";

const stuckPrompt =
  "We are stuck. Stop repeating the same fix. Name the exact failure, inspect the files or logs with the CLI, try one different small fix, and verify again.";

const narrationPrompt =
  "Create an ElevenLabs narration plan for this demo. Write an honest script tied to the visible actions, generate the voiceover, mux it with the video, then verify duration, audio stream, and playback.";

const skillInstallCommand =
  "$skillDir = 'D:\\workspace\\.codex\\skills\\think-for-me-mode'; New-Item -ItemType Directory -Force -Path $skillDir; Invoke-WebRequest -Uri 'https://illcoai.tech/tools/think-for-me-mode/skill' -OutFile (Join-Path $skillDir 'SKILL.md') -UseBasicParsing";

const skillVerifyCommand =
  "$skillPath = 'D:\\workspace\\.codex\\skills\\think-for-me-mode\\SKILL.md'; $text = Get-Content -LiteralPath $skillPath -Raw; if ($text.StartsWith('---') -and $text.Contains('name: think-for-me-mode') -and $text.Contains('## OpenAI Agents SDK View') -and $text.Contains('## ElevenLabs Narration')) { 'Think For Me skill verified' } else { throw 'Think For Me skill is missing required sections' }";

const operatingRules = [
  "Goal = destination.",
  "Plan Mode = map.",
  "CLI = hands.",
  "Automation = alarm clock.",
  "Verification = proof.",
];

const cliUses = [
  "inspect folders and files",
  "read code and logs",
  "create or edit files",
  "run tests and builds",
  "start apps locally",
  "verify outputs before claiming success",
];

const sdkKeepRules = [
  "Keep a simple prompt-only helper if one assistant and manual CLI steps are enough.",
  "Keep it if there are no tool approvals, no session state, and no specialist handoffs.",
  "Keep it if the user only needs planning, copy, or one direct next action.",
];

const sdkRedoRules = [
  "Redo with Agents SDK when the workflow needs multiple specialist agents.",
  "Redo when tools, approvals, guardrails, sessions, or traceable production runs matter.",
  "Redo when the app needs a reliable orchestrator instead of a one-off prompt.",
];

const narrationKeepRules = [
  "Keep the narration if the voice is clear and the claims match the screen.",
  "Keep it if timing is close enough for a walkthrough and the MP4 plays correctly.",
  "Keep it if ffprobe confirms a valid audio stream and the user can understand the steps.",
];

const narrationRedoRules = [
  "Redo narration if the script lies about what is visible.",
  "Redo if timing is off, the voice is too quiet, or the audio stream is missing.",
  "Redo if the final MP4 fails playback or the narration hides important visual proof.",
];

export default async function ThinkForMeModePage() {
  const access = await getProductAccess(productId);
  if (!access.allowed) {
    return <LockedThinkForMeMode reason={access.reason} signedIn={Boolean(access.user)} checkoutReady={canDirectCheckoutPublicProduct(productId)} />;
  }

  return (
    <div className="fallbackPage appLandingPage">
      <div className="workspace appLandingWorkspace thinkForMeWorkspace">
        <nav className="appLandingNav" aria-label="Think For Me navigation">
          <a className="brandBlock" href="/tools">
            <span className="brandGlyph">IC</span>
            <strong>ILLCO Tools</strong>
          </a>
          <div>
            <a className="button secondary" href="/tools">Back to Tools</a>
            <a className="button secondary" href="/commander">Commander</a>
            <a className="button primary" href="#starter-prompts">Starter Prompts</a>
          </div>
        </nav>

        <section className="panel thinkForMeHero">
          <div>
            <span className="readinessPill ready">User Helper</span>
            <h1>Think For Me Mode</h1>
            <p>
              A simple operating mode for messy projects: choose the next best move, use the CLI for evidence, avoid risky changes,
              and verify before calling work done.
            </p>
            <p className="thinkForMeAccessNotice">
              Unlocked for {access.isAdmin ? "admin access" : access.matchingPurchase?.productName || "paid account access"}.
            </p>
            <div className="heroProofBadges" aria-label="Think For Me operating model">
              <span><strong>Goal</strong> destination</span>
              <span><strong>CLI</strong> hands</span>
              <span><strong>Verify</strong> proof</span>
            </div>
          </div>
          <CopyPromptBlock label="Copy this first" prompt={starterPrompt} />
        </section>

        <section className="thinkForMeGrid">
          <InfoPanel title="How To Use It" items={operatingRules} />
          <InfoPanel title="Run Through The CLI" items={cliUses} />
        </section>

        <section className="panel thinkForMeDecisionPanel">
          <div className="panelHeader">
            <div>
              <h2>OpenAI Agents SDK View</h2>
              <p>Use this to decide if the helper should stay simple or be rebuilt as a real agent workflow.</p>
            </div>
          </div>
          <div className="thinkForMeSplit">
            <DecisionList title="Keep It Simple" items={sdkKeepRules} tone="keep" />
            <DecisionList title="Redo With Agents SDK" items={sdkRedoRules} tone="redo" />
          </div>
        </section>

        <section className="panel thinkForMeDecisionPanel">
          <div className="panelHeader">
            <div>
              <h2>ElevenLabs Narration</h2>
              <p>Use this when a demo, course, walkthrough, or proof video needs a clear spoken guide.</p>
            </div>
          </div>
          <div className="thinkForMeSplit">
            <DecisionList title="Keep The Narration" items={narrationKeepRules} tone="keep" />
            <DecisionList title="Redo The Narration" items={narrationRedoRules} tone="redo" />
          </div>
        </section>

        <section id="starter-prompts" className="panel thinkForMePrompts">
          <div className="panelHeader">
            <div>
              <h2>Starter Prompts</h2>
              <p>Use these when the user is stuck, building, or making narration.</p>
            </div>
          </div>
          <CopyPromptBlock label="Start a project" prompt={starterPrompt} />
          <CopyPromptBlock label="When stuck" prompt={stuckPrompt} />
          <CopyPromptBlock label="Narrate a demo" prompt={narrationPrompt} />
        </section>

        <section className="panel thinkForMePrompts">
          <div className="panelHeader">
            <div>
              <h2>Actual Codex Skill</h2>
              <p>Copy this into a `SKILL.md` file inside a `think-for-me-mode` skill folder.</p>
            </div>
          </div>
          <div className="thinkForMeInstallPaths">
            <span>Suggested folder</span>
            <code>D:\workspace\.codex\skills\think-for-me-mode\SKILL.md</code>
            <a className="button secondary" href="/tools/think-for-me-mode/skill" download="SKILL.md">
              Download SKILL.md
            </a>
          </div>
          <CopyPromptBlock label="Copy install command" prompt={skillInstallCommand} />
          <CopyPromptBlock label="Copy verify command" prompt={skillVerifyCommand} />
          <CopyPromptBlock label="Copy SKILL.md" prompt={thinkForMeSkillMarkdown} />
        </section>
      </div>
    </div>
  );
}

function LockedThinkForMeMode({
  reason,
  signedIn,
  checkoutReady,
}: {
  reason: string;
  signedIn: boolean;
  checkoutReady: boolean;
}) {
  return (
    <div className="fallbackPage appLandingPage">
      <div className="workspace appLandingWorkspace thinkForMeWorkspace">
        <nav className="appLandingNav" aria-label="Think For Me locked navigation">
          <a className="brandBlock" href="/tools">
            <span className="brandGlyph">IC</span>
            <strong>ILLCO Tools</strong>
          </a>
          <div>
            <a className="button secondary" href="/tools">Back to Tools</a>
            <a className="button secondary" href={`/account?returnTo=${encodeURIComponent(productReturnTo)}`}>
              {signedIn ? "Account" : "Sign in"}
            </a>
          </div>
        </nav>

        <section className="panel thinkForMeLockedHero">
          <div>
            <span className="readinessPill pending">Paid Unlock</span>
            <h1>Think For Me Mode is locked</h1>
            <p>
              This is a paid ILLCO workflow product. The prompts, install command, verification command, and `SKILL.md` download stay hidden until a paid Studio subscription is attached to the signed-in account.
            </p>
            <div className="heroProofBadges" aria-label="Locked product facts">
              <span><strong>Product</strong> Think For Me Mode</span>
              <span><strong>Plan</strong> Studio</span>
              <span><strong>Access</strong> paid account</span>
            </div>
          </div>
          <div className="thinkForMeLockCard">
            <span>Access status</span>
            <strong>Locked until paid</strong>
            <p>{reason}</p>
            <div className="thinkForMeLockActions">
              {checkoutReady ? (
                <form action="/api/subscriptions/checkout" method="post" className="inlineCheckoutForm">
                  <input type="hidden" name="planId" value={productPlanId} />
                  <input type="hidden" name="productId" value={productId} />
                  <input type="hidden" name="returnTo" value={productReturnTo} />
                  <button className="button primary" type="submit">
                    Unlock Studio Access
                  </button>
                </form>
              ) : (
                <a className="button primary" href="/#request">Request Unlock</a>
              )}
              <a className="button secondary" href={`/account?returnTo=${encodeURIComponent(productReturnTo)}`}>
                {signedIn ? "Check Account Access" : "Sign In First"}
              </a>
            </div>
          </div>
        </section>

        <section className="thinkForMeGrid">
          <article className="panel thinkForMeInfoPanel">
            <h2>What Unlocks</h2>
            <ul>
              <li>Starter prompts for project execution.</li>
              <li>Agent SDK keep-or-redo decision rules.</li>
              <li>ElevenLabs narration quality rules.</li>
              <li>Downloadable Codex `SKILL.md` install package.</li>
            </ul>
          </article>
          <article className="panel thinkForMeInfoPanel">
            <h2>Why It Is Locked</h2>
            <ul>
              <li>The page contains the actual product content.</li>
              <li>The skill file is a deliverable, not a public preview.</li>
              <li>Paid accounts keep access and receipts together.</li>
              <li>Admin accounts remain unlocked for support and testing.</li>
            </ul>
          </article>
        </section>
      </div>
    </div>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="panel thinkForMeInfoPanel">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function DecisionList({ title, items, tone }: { title: string; items: string[]; tone: "keep" | "redo" }) {
  return (
    <article className={`thinkForMeDecision ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
