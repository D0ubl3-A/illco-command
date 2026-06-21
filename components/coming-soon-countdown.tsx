"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

type CountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type LeadResult = {
  ok?: boolean;
  detail?: string;
};

type ComingSoonCountdownProps = {
  targetIso: string;
};

const popupStorageKey = "illco-monday-launch-popup-seen";

function hasSeenPopup() {
  try {
    return window.sessionStorage.getItem(popupStorageKey) === "1";
  } catch {
    return true;
  }
}

function markPopupSeen() {
  try {
    window.sessionStorage.setItem(popupStorageKey, "1");
  } catch {
  }
}

function countdownParts(targetMs: number): CountdownParts {
  const totalMs = Math.max(0, targetMs - Date.now());
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { totalMs, days, hours, minutes, seconds };
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function safeLeadResult(detail?: string) {
  if (!detail) return "Signup could not be sent. Please try again shortly.";
  if (/database|webhook|env|postgres|neon|configured|setup script|secret|token/i.test(detail)) {
    return "Signup capture is temporarily unavailable. Please try again shortly.";
  }
  return detail;
}

function fallbackName(email: string) {
  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return localPart || "Monday launch signup";
}

export function ComingSoonCountdown({ targetIso }: ComingSoonCountdownProps) {
  const targetMs = useMemo(() => Date.parse(targetIso), [targetIso]);
  const [parts, setParts] = useState<CountdownParts | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function tick() {
      setParts(countdownParts(targetMs));
    }

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [targetMs]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!hasSeenPopup()) {
        setIsPopupOpen(true);
      }
    }, 1300);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isPopupOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => emailInputRef.current?.focus(), 60);

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePopup();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isPopupOpen]);

  function closePopup() {
    markPopupSeen();
    setIsPopupOpen(false);
    window.setTimeout(() => openerRef.current?.focus(), 0);
  }

  function openPopup() {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setResult("");
    setIsPopupOpen(true);
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const name = String(formData.get("name") || "").trim() || fallbackName(email);
    const website = String(formData.get("website") || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setResult("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setResult("Joining launch list...");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website,
          name,
          email,
          company: "",
          planId: "monday-launch-waitlist",
          message: "Monday launch email signup from the ILLCO Tools coming soon countdown.",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as LeadResult;

      if (payload.ok) {
        markPopupSeen();
        setSubmitted(true);
        setResult("You are on the Monday launch list.");
        form.reset();
      } else {
        setResult(safeLeadResult(payload.detail));
      }
    } catch {
      setResult("Signup could not be sent. Please try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLive = Boolean(parts && parts.totalMs <= 0);
  const countdown = parts
    ? [
        { label: "Days", value: parts.days },
        { label: "Hours", value: parts.hours },
        { label: "Minutes", value: parts.minutes },
        { label: "Seconds", value: parts.seconds },
      ]
    : [
        { label: "Days", value: 0 },
        { label: "Hours", value: 0 },
        { label: "Minutes", value: 0 },
        { label: "Seconds", value: 0 },
      ];

  return (
    <>
      <section className="launchCountdownDock" aria-label="Monday launch countdown">
        <div className="launchCountdownRibbon" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="launchCountdownCopy">
          <p className="companionsPageEyebrow">Coming Soon</p>
          <h2>{isLive ? "Monday launch window is open" : "Launch window opens Monday"}</h2>
          <p>Countdown targets Monday, May 25, 2026 at 9:00 AM Pacific.</p>
        </div>
        <div className="launchCountdownClock" aria-live="polite">
          {countdown.map((item) => (
            <span className="launchCountdownUnit" key={item.label}>
              <strong>{twoDigits(item.value)}</strong>
              <small>{item.label}</small>
            </span>
          ))}
        </div>
        <button className="button primary launchCountdownButton" type="button" onClick={openPopup}>
          Join Email List
        </button>
      </section>

      {isPopupOpen ? (
        <div className="launchSignupOverlay" role="presentation" onMouseDown={closePopup}>
          <section
            className="launchSignupDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="launch-signup-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="launchSignupSignal" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <button className="launchSignupClose" type="button" aria-label="Close signup popup" onClick={closePopup}>
              x
            </button>
            <div className="launchSignupHeader">
              <p className="companionsPageEyebrow">Monday Access List</p>
              <h2 id="launch-signup-title">Get the launch email</h2>
              <p>Leave an email and ILLCO will follow up when the Monday launch window opens.</p>
            </div>
            <form className="launchSignupForm formStack" onSubmit={submitSignup}>
              <input className="honeyField" name="website" tabIndex={-1} autoComplete="off" />
              <label>
                Name
                <input name="name" autoComplete="name" placeholder="Optional" />
              </label>
              <label>
                Email
                <input ref={emailInputRef} name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
              </label>
              <button className="button primary" type="submit" disabled={isSubmitting || submitted}>
                {submitted ? "Joined" : isSubmitting ? "Joining..." : "Join Monday List"}
              </button>
              {result ? <output className="resultBox">{result}</output> : null}
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
