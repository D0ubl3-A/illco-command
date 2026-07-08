"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

type PetPitch = {
  label: string;
  response: string;
  href: string;
  cta: string;
  needsQuoteForm?: boolean;
};

type QuickPrompt = {
  petId: PetId;
  label: string;
  message: string;
};

type PetId = "lyric-forge" | "workflow-router" | "access-scout" | "m3ntally-ill";

type PetProfile = {
  id: PetId;
  name: string;
  title: string;
  promise: string;
  defaultLine: string;
  spriteClass: string;
  voiceEnabled?: boolean;
};

type MasterAgentRecommendation = {
  canOpen: boolean;
  canCheckout: boolean;
  detailsHref: string;
  requestHref: string;
  openHref: string | null;
  imagePath: string;
  name: string;
  summary: string;
  reason: string;
  category: string;
};

type MasterAgentResponse = {
  ok?: boolean;
  summary?: string;
  recommendations?: MasterAgentRecommendation[];
  nextSteps?: string[];
  detail?: string;
};

const petRoster: PetProfile[] = [
  {
    id: "lyric-forge",
    name: "Lyric Forge",
    title: "lyric video pet",
    promise: "I route artists into lyric video, caption, music-video, and release-ready creative tools.",
    defaultLine: "Tell me the song, deadline, and visual style. I will push you to the fastest lyric-video path.",
    spriteClass: "lyricForge",
  },
  {
    id: "workflow-router",
    name: "Workflow Router",
    title: "AI app finder pet",
    promise: "I match messy work to the right ILLCO app, subscription, or custom build lane.",
    defaultLine: "Tell me the recurring workflow. I will map the app, access route, and next action.",
    spriteClass: "workflowRouter",
  },
  {
    id: "access-scout",
    name: "Access Scout",
    title: "account support pet",
    promise: "I help with bought products, account access, billing handoff, and unlock problems.",
    defaultLine: "Tell me what you bought and where access got stuck. I will route the support lane.",
    spriteClass: "accessScout",
  },
  {
    id: "m3ntally-ill",
    name: "m3ntally-ill",
    title: "custom AI voice rep",
    promise: "I sell, route, and explain the ILLCO app store with the custom ElevenLabs voice when configured.",
    defaultLine: "Tell me what you need built, sold, fixed, or automated. I will point you to the shortest buyer path.",
    spriteClass: "m3ntallyIll",
    voiceEnabled: true,
  },
];

const defaultPet = petRoster[3];

const quickPrompts: QuickPrompt[] = [
  { petId: "lyric-forge", label: "I need a lyric video", message: "I need a lyric video built fast and want the best route to launch." },
  { petId: "workflow-router", label: "I need an AI tool", message: "I need an AI tool for a recurring workflow and want a live route." },
  { petId: "access-scout", label: "I already bought", message: "I already bought something and need account, billing, or access help." },
  { petId: "m3ntally-ill", label: "I need custom build", message: "I need a custom build and want a live quote to start." },
];

const quoteFallback = {
  message: "Need a custom build quote. Please capture requirements, expected outputs, and timeline.",
  planId: "custom-build-request",
};

function loadBooleanStorage(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

function getTimeAwareGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning mode";
  if (hour < 18) return "Work mode";
  return "Night shift";
}

function primaryPitchFromAgent(response: MasterAgentResponse, pet: PetProfile): PetPitch {
  const summary = response.summary || pet.defaultLine;
  const [topMatch] = response.recommendations || [];
  if (!topMatch) {
    return {
      label: "General routing",
      response: summary,
      href: "/#request",
      cta: "Start custom route",
      needsQuoteForm: true,
    };
  }

  if (topMatch.canOpen && topMatch.openHref) {
    return {
      label: topMatch.name,
      response: `${summary} ${topMatch.reason}`,
      href: topMatch.openHref,
      cta: "Open recommendation",
    };
  }

  if (topMatch.canCheckout) {
    return {
      label: topMatch.name,
      response: `${summary} ${topMatch.reason}`,
      href: `${topMatch.detailsHref}#request`,
      cta: "Request access setup",
      needsQuoteForm: true,
    };
  }

  return {
    label: topMatch.name,
    response: `${summary} ${topMatch.reason}`,
    href: topMatch.requestHref || `${topMatch.detailsHref}#request`,
    cta: topMatch.canOpen || topMatch.canCheckout ? "Open recommendation" : "Request quote",
    needsQuoteForm: true,
  };
}

export function SitePetSalesAgent() {
  const [open, setOpen] = useState(false);
  const [activePetId, setActivePetId] = useState<PetId>(defaultPet.id);
  const [assistantEnabled, setAssistantEnabled] = useState(() => loadBooleanStorage("illcoSitePetEnabled", true));
  const [autoClearEnabled, setAutoClearEnabled] = useState(() => loadBooleanStorage("illcoSitePetAutoClearEnabled", true));
  const [petInput, setPetInput] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheNotice, setCacheNotice] = useState("");
  const [selectedPitch, setSelectedPitch] = useState<PetPitch>({
    label: quickPrompts[0].label,
    response: defaultPet.defaultLine,
    href: "/ads/lyric-video-forge",
    cta: "Open lyric video sale",
  });
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [routeError, setRouteError] = useState("");
  const [isRouting, setIsRouting] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteName, setQuoteName] = useState("");
  const [quoteEmail, setQuoteEmail] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteResult, setQuoteResult] = useState("");
  const greeting = useMemo(() => getTimeAwareGreeting(), []);
  const activePet = useMemo(() => petRoster.find((pet) => pet.id === activePetId) || defaultPet, [activePetId]);
  const activePetIndex = useMemo(() => petRoster.findIndex((pet) => pet.id === activePetId), [activePetId]);

  useEffect(() => {
    window.localStorage.setItem("illcoSitePetEnabled", String(assistantEnabled));
  }, [assistantEnabled]);

  useEffect(() => {
    window.localStorage.setItem("illcoSitePetAutoClearEnabled", String(autoClearEnabled));
  }, [autoClearEnabled]);

  useEffect(() => {
    if (!autoClearEnabled) {
      return;
    }

    const clearOnStaleAge = async () => {
      const lastClear = Number(window.localStorage.getItem("illcoSitePetLastAutoClearAt") || 0);
      const ageMs = Date.now() - lastClear;
      const maxAgeMs = 6 * 60 * 60 * 1000;

      if (lastClear && ageMs < maxAgeMs) {
        return;
      }

      await clearCaches(false);
    };

    void clearOnStaleAge();
    // only run when enabled state changes
  }, [autoClearEnabled]);

  async function clearCaches(showNotice: boolean) {
    setIsClearingCache(true);
    try {
      if (typeof window === "undefined") return;
      sessionStorage.clear();
      const scopedKeys = [
        "illcoPetLastPrompt",
        "illcoPetInputDraft",
        "illcoLyricForgeDraft",
        "illcoLyricForgeLastResult",
      ];
      scopedKeys.forEach((key) => window.localStorage.removeItem(key));
      if (typeof caches !== "undefined") {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
      window.localStorage.setItem("illcoSitePetLastAutoClearAt", String(Date.now()));
      if (showNotice) {
        setCacheNotice("Browser cache cleared.");
      }
    } catch {
      if (showNotice) {
        setCacheNotice("Cache clear blocked by browser policy.");
      }
    } finally {
      setIsClearingCache(false);
      if (showNotice) {
        setTimeout(() => setCacheNotice(""), 3000);
      }
    }
  }

  async function runAgentRouting(message: string, petOverride?: PetProfile) {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;
    const routingPet = petOverride || activePet;

    setIsRouting(true);
    setRouteError("");
    setShowQuoteForm(false);
    setQuoteResult("");

    try {
      const response = await fetch("/api/site-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cleanMessage, petId: routingPet.id }),
      });
      const payload = (await response.json().catch(() => ({}))) as MasterAgentResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.detail || "Master Agent could not route that request.");
      }

      setSelectedPitch(primaryPitchFromAgent(payload, routingPet));
      setNextSteps(payload.nextSteps || []);
      if (payload.summary) {
        const safeSummary = payload.summary.trim();
        const safeAgentSteps = (payload.nextSteps || [])
          .map((step) => step.trim())
          .filter((step) => step.length > 0)
          .slice(0, 2);
        setNextSteps([safeSummary, ...safeAgentSteps]);
      }
      setQuoteMessage(cleanMessage);
      setPetInput("");
    } catch {
      setRouteError("Routing service is unavailable. I will open the direct request lane.");
      setSelectedPitch({
        label: "Fallback route",
        response: "Routing service is temporarily unavailable. Use this lane to request a custom quote or setup.",
        href: "/#request",
        cta: "Start request",
        needsQuoteForm: true,
      });
    } finally {
      setIsRouting(false);
    }
  }

  function submitPetPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!petInput.trim()) return;
    void runAgentRouting(petInput);
  }

  function submitQuickPrompt(prompt: QuickPrompt) {
    const promptPet = petRoster.find((pet) => pet.id === prompt.petId) || activePet;
    setActivePetId(promptPet.id);
    const message = prompt.message;
    setPetInput(message);
    void runAgentRouting(message, promptPet);
  }

  function selectPet(pet: PetProfile) {
    setActivePetId(pet.id);
    setSelectedPitch({
      label: pet.name,
      response: pet.defaultLine,
      href: pet.id === "lyric-forge" ? "/ads/lyric-video-forge" : "/#request",
      cta: pet.id === "lyric-forge" ? "Open lyric video sale" : "Start request",
      needsQuoteForm: pet.id !== "lyric-forge",
    });
    setNextSteps([]);
    setVoiceStatus("");
  }

  function shiftPet(direction: number) {
    const nextIndex = activePetIndex < 0 ? 0 : (activePetIndex + direction + petRoster.length) % petRoster.length;
    selectPet(petRoster[nextIndex]);
  }

  function pickRandomPet() {
    const nextIndex = Math.floor(Math.random() * petRoster.length);
    selectPet(petRoster[nextIndex]);
  }

  async function playCustomVoice() {
    if (!activePet.voiceEnabled || isGeneratingVoice) return;
    const text = (selectedPitch.response || activePet.defaultLine).replace(/\s+/g, " ").trim().slice(0, 600);
    if (!text) return;

    setIsGeneratingVoice(true);
    setVoiceStatus("");
    try {
      const response = await fetch("/api/site-pet-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: activePet.id, text }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail || "Voice is not configured yet.");
      }

      const audioUrl = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl);
      audio.addEventListener("ended", () => URL.revokeObjectURL(audioUrl), { once: true });
      await audio.play();
      setVoiceStatus("Playing custom ElevenLabs voice.");
    } catch (error) {
      setVoiceStatus(error instanceof Error ? error.message : "Voice playback failed.");
    } finally {
      setIsGeneratingVoice(false);
    }
  }

  async function submitCustomQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = quoteName.trim();
    const email = quoteEmail.trim();
    const message = quoteMessage.trim() || selectedPitch.response || quoteFallback.message;

    if (!name || !email) return;

    setQuoteSubmitting(true);
    setQuoteResult("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          planId: quoteFallback.planId,
          message,
          company: "quote-request",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; detail?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.detail || "Request capture failed.");
      }
      setQuoteResult("Live quote request sent. We will return with a scoped quote.");
      setShowQuoteForm(false);
      setQuoteName("");
      setQuoteEmail("");
    } catch (error) {
      setQuoteResult(error instanceof Error ? error.message : "Live quote request could not be sent.");
    } finally {
      setQuoteSubmitting(false);
    }
  }

  return (
    <aside className={`sitePetAgent ${open ? "open" : "closed"}`} aria-label="ILLCO pet site assistant and sales rep">
      {!assistantEnabled ? (
        <button className="sitePetAgentToggle sitePetAgentEnable" type="button" onClick={() => setAssistantEnabled(true)}>
          <span className="sitePetAvatar" aria-hidden="true">
            <span className={`sitePetSprite ${activePet.spriteClass}`} />
          </span>
          <span>
            <strong>{activePet.name}</strong>
            <small>Show assistant</small>
          </span>
        </button>
      ) : (
        <button className="sitePetAgentToggle" type="button" onClick={() => setOpen((value) => !value)}>
          <span className="sitePetAvatar" aria-hidden="true">
            <span className={`sitePetSprite ${activePet.spriteClass}`} />
          </span>
          <span>
            <strong>{activePet.name}</strong>
            <small>{open ? "Hide rep" : "Ask the rep"}</small>
          </span>
        </button>
      )}

      {open ? (
        <div className="sitePetAgentPanel">
          <div className="sitePetAgentHeader">
            <span>{greeting}</span>
            <h2>{activePet.title}</h2>
            <p>{activePet.promise}</p>
          </div>

          <div className="sitePetControlPanel" aria-label="Character controls" style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            <strong style={{ fontSize: "0.9rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>Character controls</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <button className="sitePetSecondaryCta" type="button" onClick={() => shiftPet(-1)}>
                Previous character
              </button>
              <button className="sitePetSecondaryCta" type="button" onClick={() => shiftPet(1)}>
                Next character
              </button>
              <button className="sitePetSecondaryCta" type="button" onClick={pickRandomPet}>
                Random character
              </button>
              <button className="sitePetSecondaryCta" type="button" onClick={() => void playCustomVoice()} disabled={!activePet.voiceEnabled || isGeneratingVoice}>
                {activePet.voiceEnabled ? (isGeneratingVoice ? "Speaking..." : "Speak as this character") : "No voice for this character"}
              </button>
            </div>
            <small style={{ color: "var(--muted, #9aa3b2)" }}>Use the buttons above to switch who is active. The voice button only works on the voice-enabled character.</small>
          </div>

          <div className="sitePetRoster" aria-label="Pet assistant roster">
            {petRoster.map((pet) => (
              <button
                className={activePet.id === pet.id ? "active" : ""}
                type="button"
                key={pet.id}
                onClick={() => selectPet(pet)}
              >
                <span className="sitePetMiniAvatar" aria-hidden="true">
                  <span className={`sitePetSprite ${pet.spriteClass}`} />
                </span>
                <span>{pet.name}</span>
              </button>
            ))}
          </div>

          <form className="sitePetPromptForm" onSubmit={submitPetPrompt}>
            <label htmlFor="illco-site-pet-input">Send me your request</label>
            <textarea
              id="illco-site-pet-input"
              value={petInput}
              rows={2}
              onChange={(event) => setPetInput(event.target.value)}
              placeholder="Tell me what you need. Example: I need a custom build with quote and timeline."
            />
            <button className="sitePetPrimaryCta" type="submit" disabled={isRouting}>
              {isRouting ? "Routing..." : "Route my request"}
            </button>
          </form>

          <div className="sitePetBubble">
            <strong>My read:</strong>
            <p>{selectedPitch.response || activePet.defaultLine}</p>
            {routeError ? <small>{routeError}</small> : null}
          </div>

          {nextSteps.length ? (
            <div className="sitePetBubble">
              <strong>Next steps</strong>
              <ol>
                {nextSteps.slice(0, 3).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="sitePetChoices" aria-label="Common buyer paths">
            {quickPrompts.map((prompt) => (
              <button
                className={activePet.id === prompt.petId ? "active" : ""}
                type="button"
                key={prompt.label}
                onClick={() => {
                  submitQuickPrompt(prompt);
                }}
              >
                {prompt.label}
              </button>
            ))}
          </div>

          <a className="sitePetPrimaryCta" href={selectedPitch.href}>
            {selectedPitch.cta}
          </a>

          {activePet.voiceEnabled ? (
            <>
              <button className="sitePetVoiceCta" type="button" onClick={() => void playCustomVoice()} disabled={isGeneratingVoice}>
                {isGeneratingVoice ? "Generating voice..." : "Play m3ntally-ill voice"}
              </button>
              {voiceStatus ? <small className="sitePetCacheNotice">{voiceStatus}</small> : null}
            </>
          ) : null}

          {selectedPitch.needsQuoteForm ? (
            <button className="sitePetSecondaryCta" type="button" onClick={() => setShowQuoteForm((value) => !value)}>
              {showQuoteForm ? "Hide live quote form" : "Request a live quote"}
            </button>
          ) : null}

          {showQuoteForm ? (
            <form className="sitePetPromptForm" onSubmit={submitCustomQuote}>
              <label htmlFor="illco-site-pet-quote-name">Name</label>
              <input
                id="illco-site-pet-quote-name"
                value={quoteName}
                onChange={(event) => setQuoteName(event.target.value)}
                placeholder="Your name"
              />
              <label htmlFor="illco-site-pet-quote-email">Email</label>
              <input
                id="illco-site-pet-quote-email"
                type="email"
                value={quoteEmail}
                onChange={(event) => setQuoteEmail(event.target.value)}
                placeholder="you@company.com"
              />
              <label htmlFor="illco-site-pet-quote-message">Project details</label>
              <textarea
                id="illco-site-pet-quote-message"
                value={quoteMessage}
                rows={4}
                onChange={(event) => setQuoteMessage(event.target.value)}
                placeholder={quoteFallback.message}
              />
              <button className="sitePetPrimaryCta" type="submit" disabled={quoteSubmitting || !quoteName.trim() || !quoteEmail.trim()}>
                {quoteSubmitting ? "Sending live quote request..." : "Send live quote request"}
              </button>
              {quoteResult ? <small className="sitePetCacheNotice">{quoteResult}</small> : null}
            </form>
          ) : null}

          <label className="sitePetSettings">
            <span>Assistant visible</span>
            <input
              type="checkbox"
              checked={assistantEnabled}
              onChange={(event) => {
                const value = event.target.checked;
                setAssistantEnabled(value);
                if (!value) setOpen(false);
              }}
            />
          </label>

          <label className="sitePetSettings">
            <span>Auto clear cache</span>
            <input
              type="checkbox"
              checked={autoClearEnabled}
              onChange={(event) => setAutoClearEnabled(event.target.checked)}
            />
          </label>

          <button className="sitePetSecondaryCta" type="button" onClick={() => void clearCaches(true)} disabled={isClearingCache}>
            {isClearingCache ? "Clearing..." : "Clear local cache"}
          </button>

          {cacheNotice ? <small className="sitePetCacheNotice">{cacheNotice}</small> : null}
        </div>
      ) : null}
    </aside>
  );
}
