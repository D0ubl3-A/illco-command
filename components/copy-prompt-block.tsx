"use client";

import { useState } from "react";

type CopyPromptBlockProps = {
  label: string;
  prompt: string;
};

export function CopyPromptBlock({ label, prompt }: CopyPromptBlockProps) {
  const [copyState, setCopyState] = useState("Copy");

  async function copyPrompt() {
    setCopyState("Copied");

    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(prompt);
        } catch {
          fallbackCopy(prompt);
        }
      } else {
        fallbackCopy(prompt);
      }

      window.setTimeout(() => setCopyState("Copy"), 1800);
    } catch {
      setCopyState("Select text");
      window.setTimeout(() => setCopyState("Copy"), 2200);
    }
  }

  return (
    <div className="thinkForMePromptBlock">
      <div className="thinkForMePromptBlockHeader">
        <span>{label}</span>
        <button className="button secondary" type="button" onClick={copyPrompt}>
          {copyState}
        </button>
      </div>
      <code>{prompt}</code>
    </div>
  );
}

function fallbackCopy(value: string) {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

