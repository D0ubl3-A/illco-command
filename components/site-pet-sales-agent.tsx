"use client";

import { useMemo, useState } from "react";

type PetPitch = {
  label: string;
  response: string;
  href: string;
  cta: string;
};

const petRep = {
  name: "M3ntally-iLL Me",
  title: "site assistant + sales rep",
  promise: "I help you pick the fastest ILLCO path, unlock the right tool, and get moving without wandering the site.",
  defaultLine:
    "Tell me what you need built, sold, fixed, or automated. I will point you to the shortest buyer path.",
};

const pitches: PetPitch[] = [
  {
    label: "I need a lyric video",
    response:
      "Use the Lyric Video Forge. Start with the 1-day trial, keep it tight, and test the output before buying bigger.",
    href: "/ads/lyric-video-forge",
    cta: "Open lyric video sale",
  },
  {
    label: "I need an AI tool",
    response:
      "Go through the tools shelf first. If there is already a working ILLCO module, buy that before paying for a custom build.",
    href: "/tools",
    cta: "Browse ILLCO tools",
  },
  {
    label: "I already bought",
    response:
      "Open your account. Purchases, launch links, and access state should stay tied to the same ILLCO login.",
    href: "/account",
    cta: "Open account",
  },
  {
    label: "I need custom work",
    response:
      "Send the build request direct. Keep it simple: what it should do, where it should run, and what makes it worth money.",
    href: "mailto:admin@illcoai.tech?subject=ILLCO%20custom%20AI%20build%20request",
    cta: "Request custom build",
  },
];

function getTimeAwareGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning mode";
  if (hour < 18) return "Work mode";
  return "Night shift";
}

export function SitePetSalesAgent() {
  const [open, setOpen] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState<PetPitch>(pitches[0]);
  const greeting = useMemo(() => getTimeAwareGreeting(), []);

  return (
    <aside className={`sitePetAgent ${open ? "open" : "closed"}`} aria-label="ILLCO pet site assistant and sales agent">
      <button className="sitePetAgentToggle" type="button" onClick={() => setOpen((value) => !value)}>
        <span className="sitePetAvatar" aria-hidden="true">
          <span className="sitePetSprite" />
        </span>
        <span>
          <strong>{petRep.name}</strong>
          <small>{open ? "Hide rep" : "Ask the rep"}</small>
        </span>
      </button>

      {open ? (
        <div className="sitePetAgentPanel">
          <div className="sitePetAgentHeader">
            <span>{greeting}</span>
            <h2>{petRep.title}</h2>
            <p>{petRep.promise}</p>
          </div>

          <div className="sitePetBubble">
            <strong>My read:</strong>
            <p>{selectedPitch.response || petRep.defaultLine}</p>
          </div>

          <div className="sitePetChoices" aria-label="Common buyer paths">
            {pitches.map((pitch) => (
              <button
                className={selectedPitch.label === pitch.label ? "active" : ""}
                type="button"
                key={pitch.label}
                onClick={() => setSelectedPitch(pitch)}
              >
                {pitch.label}
              </button>
            ))}
          </div>

          <a className="sitePetPrimaryCta" href={selectedPitch.href}>
            {selectedPitch.cta}
          </a>
        </div>
      ) : null}
    </aside>
  );
}
