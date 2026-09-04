"use client";

import { useEffect, useState } from "react";
import styles from "./intent-gate.module.css";

type GateMode = "main" | "custom";

const customChoices = [
  {
    label: "Missed calls",
    description: "Recover callers automatically and turn missed opportunities into conversations.",
    href: "/lead-rescue",
  },
  {
    label: "Lost or slow leads",
    description: "Fix response gaps, follow-up delays, and lead leakage.",
    href: "/lead-recovery",
  },
  {
    label: "Need a website or app",
    description: "Explore launch-ready products, storefronts, and custom builds.",
    href: "/products",
  },
  {
    label: "Need automation",
    description: "Find the right AI workflow, agent, or operations system.",
    href: "/#catalog",
  },
  {
    label: "Need content or media",
    description: "Start with creator tools for video, audio, and growth.",
    href: "/tools/lyric-video-forge",
  },
  {
    label: "Want a game built",
    description: "Enter iLLCo Games and explore playable-world technology.",
    href: "/games#build",
  },
  {
    label: "Something else",
    description: "Jump to custom builds and tell us exactly what you need.",
    href: "/#build",
  },
];

function markSeen() {
  try {
    window.sessionStorage.setItem("illco-intent-gate-v1", "seen");
  } catch {
    // Browsers with storage disabled can still use the selector.
  }
}

export function IntentGate() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<GateMode>("main");

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem("illco-intent-gate-v1") === "seen";
    } catch {
      seen = false;
    }

    if (!seen) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        markSeen();
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function dismiss() {
    markSeen();
    setOpen(false);
  }

  function go(href: string) {
    markSeen();
    window.location.assign(href);
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="intent-gate-title">
      <div className={styles.aurora} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <div className={styles.shell}>
        <div className={styles.topline}>
          <span className={styles.brand}>iLLCo AI</span>
          <button className={styles.skip} type="button" onClick={dismiss}>
            Skip for now
          </button>
        </div>

        {mode === "main" ? (
          <>
            <div className={styles.heading}>
              <span className={styles.eyebrow}>CHOOSE YOUR LANE</span>
              <h1 id="intent-gate-title">What are you here for?</h1>
              <p>Choose your lane and we&apos;ll take you straight to the right experience.</p>
            </div>

            <div className={styles.cards}>
              <button className={`${styles.card} ${styles.aiCard}`} type="button" onClick={() => go("/#catalog")}>
                <span className={styles.cardIndex}>01</span>
                <span className={styles.cardGlow} aria-hidden="true" />
                <span className={styles.icon}>AI</span>
                <strong>AI Services</strong>
                <span>Automation, agents, lead systems, and business tools.</span>
                <em>Explore AI services →</em>
              </button>

              <button className={`${styles.card} ${styles.gamesCard}`} type="button" onClick={() => go("/games")}>
                <span className={styles.cardIndex}>02</span>
                <span className={styles.cardGlow} aria-hidden="true" />
                <span className={styles.icon}>▶</span>
                <strong>Games</strong>
                <span>WorldForge, playable worlds, ReelWorld, JC, and game innovation.</span>
                <em>Enter iLLCo Games →</em>
              </button>

              <button className={`${styles.card} ${styles.mediaCard}`} type="button" onClick={() => go("/tools/lyric-video-forge")}>
                <span className={styles.cardIndex}>03</span>
                <span className={styles.cardGlow} aria-hidden="true" />
                <span className={styles.icon}>◉</span>
                <strong>Content / Media</strong>
                <span>Video, music tools, creator systems, and viral assets.</span>
                <em>Open creator tools →</em>
              </button>

              <button className={`${styles.card} ${styles.customCard}`} type="button" onClick={() => setMode("custom")}>
                <span className={styles.cardIndex}>04</span>
                <span className={styles.cardGlow} aria-hidden="true" />
                <span className={styles.icon}>✦</span>
                <strong>Custom Solution</strong>
                <span>Tell us the problem. We&apos;ll route you to the best solution.</span>
                <em>Find my solution →</em>
              </button>
            </div>

            <div className={styles.trustRow}>
              <span>Working products</span>
              <span>Real builds</span>
              <span>Human-guided AI</span>
              <span>Henderson, Nevada</span>
            </div>
          </>
        ) : (
          <div className={styles.customPanel}>
            <button className={styles.back} type="button" onClick={() => setMode("main")}>
              ← Back
            </button>
            <div className={styles.heading}>
              <span className={styles.eyebrow}>CUSTOM ROUTER</span>
              <h1 id="intent-gate-title">What&apos;s your biggest problem?</h1>
              <p>Pick the closest match. You can change lanes anytime.</p>
            </div>
            <div className={styles.choiceGrid}>
              {customChoices.map((choice) => (
                <button key={choice.label} type="button" className={styles.choice} onClick={() => go(choice.href)}>
                  <strong>{choice.label}</strong>
                  <span>{choice.description}</span>
                  <em>Go →</em>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
