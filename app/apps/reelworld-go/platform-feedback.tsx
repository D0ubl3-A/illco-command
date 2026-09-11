"use client";

import { useEffect } from "react";

type VibratePattern = number | number[];

declare global {
  interface Window {
    __reelWorldFeedbackMode?: "vibration" | "ios-fallback" | "visual";
  }
}

function patternDuration(pattern: VibratePattern) {
  const values = Array.isArray(pattern) ? pattern : [pattern];
  return Math.max(18, Math.min(420, values.reduce((sum, value) => sum + Math.max(0, value), 0)));
}

export function ReelWorldPlatformFeedback() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    if (typeof navigator.vibrate === "function") {
      window.__reelWorldFeedbackMode = "vibration";
      return;
    }

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    window.__reelWorldFeedbackMode = ios ? "ios-fallback" : "visual";

    let audio: AudioContext | null = null;
    const unlockAudio = () => {
      try {
        audio ??= new AudioContext();
        if (audio.state === "suspended") void audio.resume();
      } catch {}
    };
    window.addEventListener("pointerdown", unlockAudio, { passive: true });

    const fallback = (pattern: VibratePattern = 35) => {
      const duration = patternDuration(pattern);
      document.documentElement.dataset.reelworldFeedback = "pulse";
      window.setTimeout(() => {
        delete document.documentElement.dataset.reelworldFeedback;
      }, Math.min(180, duration));

      try {
        unlockAudio();
        if (!audio || audio.state !== "running") return true;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = 72;
        gain.gain.setValueAtTime(0.0001, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.028, audio.currentTime + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + Math.min(0.07, duration / 1000));
        osc.connect(gain).connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + Math.min(0.08, duration / 1000 + 0.01));
      } catch {}
      return true;
    };

    try {
      Object.defineProperty(navigator, "vibrate", { configurable: true, value: fallback });
    } catch {}

    const style = document.createElement("style");
    style.dataset.reelworldPlatformFeedback = "true";
    style.textContent = `
      html[data-reelworld-feedback="pulse"] body::after {
        content: "";
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        pointer-events: none;
        box-shadow: inset 0 0 0 3px rgba(110, 220, 255, .42);
        animation: reelworld-platform-pulse 140ms ease-out both;
      }
      @keyframes reelworld-platform-pulse {
        from { opacity: .9; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      style.remove();
      try { void audio?.close(); } catch {}
    };
  }, []);

  return null;
}
