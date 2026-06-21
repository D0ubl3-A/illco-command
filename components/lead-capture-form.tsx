"use client";

import { type FormEvent, useState } from "react";

type LeadCaptureFormProps = {
  serviceId: string;
  productName?: string;
  buttonLabel?: string;
  messagePlaceholder?: string;
};

function safeLeadResult(detail?: string) {
  if (!detail) return "Request could not be sent. Please try again shortly.";
  if (/database|webhook|env|postgres|neon|configured|setup script|secret|token/i.test(detail)) {
    return "Request capture is temporarily unavailable. Please try again shortly.";
  }
  return detail;
}

export function LeadCaptureForm({
  serviceId,
  productName,
  buttonLabel = "Request Setup",
  messagePlaceholder = "Tell us what you want this system to handle first.",
}: LeadCaptureFormProps) {
  const [result, setResult] = useState("");

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setResult("Sending request...");

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; detail?: string };
    setResult(payload.ok ? "Request received. We will follow up with setup options." : safeLeadResult(payload.detail));
  }

  return (
    <form onSubmit={submitLead} className="formStack">
      <input className="honeyField" name="website" tabIndex={-1} autoComplete="off" />
      <input type="hidden" name="planId" value={serviceId} />
      <label>
        Name
        <input name="name" required />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Company
        <input name="company" />
      </label>
      <label>
        Message
        <textarea
          name="message"
          rows={5}
          placeholder={productName ? `Tell us what ${productName} should help with first.` : messagePlaceholder}
        />
      </label>
      <button className="button primary" type="submit">{buttonLabel}</button>
      {result ? <output className="resultBox">{result}</output> : null}
    </form>
  );
}
