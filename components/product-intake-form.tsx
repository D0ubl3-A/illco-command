"use client";

import { type FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

type IntakeKind = "lead-recovery" | "youtube-revival";

type ProductIntakeFormProps = {
  kind: IntakeKind;
  planId: string;
  productName: string;
  submitLabel?: string;
  checkoutHref?: string;
};

type LeadResponse = {
  ok?: boolean;
  detail?: string;
  leadId?: string;
};

function safeError(detail?: string) {
  if (!detail) return "The request could not be saved. Please try again.";
  if (/database|webhook|env|postgres|neon|secret|token|configured/i.test(detail)) {
    return "The request could not be saved right now. Please try again shortly.";
  }
  return detail;
}

function fieldValue(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

export function ProductIntakeForm({
  kind,
  planId,
  productName,
  submitLabel = "Submit secure intake",
  checkoutHref,
}: ProductIntakeFormProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const isLeadRecovery = kind === "lead-recovery";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus("submitting");
    setMessage("");

    const details = [
      `Product: ${productName}`,
      `Source: ${kind}-sales-page`,
      `Phone: ${fieldValue(formData, "phone") || "Not provided"}`,
      `${isLeadRecovery ? "Business website" : "YouTube channel"}: ${fieldValue(formData, "productUrl") || "Not provided"}`,
      `${isLeadRecovery ? "Missed calls per month" : "Videos to revive"}: ${fieldValue(formData, "volume") || "Not provided"}`,
      `Primary goal: ${fieldValue(formData, "goal") || "Not provided"}`,
      `Current tools/access: ${fieldValue(formData, "tools") || "Not provided"}`,
      `Target start: ${fieldValue(formData, "timeline") || "Not provided"}`,
      `Notes: ${fieldValue(formData, "notes") || "None"}`,
    ].join("\n");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fieldValue(formData, "name"),
          email: fieldValue(formData, "email"),
          company: fieldValue(formData, "company"),
          planId,
          message: details,
          website: fieldValue(formData, "website"),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as LeadResponse;
      if (!response.ok || !payload.ok) {
        setStatus("error");
        setMessage(safeError(payload.detail));
        return;
      }

      setStatus("success");
      setMessage(
        isLeadRecovery
          ? "Intake received. ILLCO will review fit and send the installation plan within one business day."
          : "Intake received. Your channel details are saved and ready for the checkout handoff.",
      );
      form.reset();
    } catch {
      setStatus("error");
      setMessage("The request could not be saved. Check your connection and try again.");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 sm:p-7">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Secure product intake</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Give ILLCO the details needed to start.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          No passwords are requested here. ILLCO only asks for the minimum information needed to scope and deliver the work.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-4" aria-busy={status === "submitting"}>
        <input className="hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-200">
            Name
            <input
              className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-3 text-white outline-none transition focus:border-cyan-300"
              name="name"
              required
              autoComplete="name"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-200">
            Email
            <input
              className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-3 text-white outline-none transition focus:border-cyan-300"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-200">
            {isLeadRecovery ? "Business" : "Channel or brand"}
            <input
              className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-3 text-white outline-none transition focus:border-cyan-300"
              name="company"
              required
              autoComplete="organization"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-200">
            Phone
            <input
              className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-3 text-white outline-none transition focus:border-cyan-300"
              name="phone"
              type="tel"
              autoComplete="tel"
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-slate-200">
          {isLeadRecovery ? "Business website" : "YouTube channel URL"}
          <input
            className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-3 text-white outline-none transition focus:border-cyan-300"
            name="productUrl"
            type="url"
            required
            placeholder={isLeadRecovery ? "https://yourbusiness.com" : "https://youtube.com/@yourchannel"}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-200">
            {isLeadRecovery ? "Estimated missed calls per month" : "How many videos need revival?"}
            <select
              className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-3 text-white outline-none transition focus:border-cyan-300"
              name="volume"
              required
            >
              <option value="">Choose one</option>
              {isLeadRecovery ? (
                <>
                  <option>1-10</option>
                  <option>11-30</option>
                  <option>31-75</option>
                  <option>76+</option>
                  <option>Unknown</option>
                </>
              ) : (
                <>
                  <option>1-5</option>
                  <option>6-15</option>
                  <option>16-50</option>
                  <option>51+</option>
                </>
              )}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-200">
            Target start
            <select
              className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-3 text-white outline-none transition focus:border-cyan-300"
              name="timeline"
              required
            >
              <option value="">Choose one</option>
              <option>Immediately</option>
              <option>Within 7 days</option>
              <option>Within 30 days</option>
              <option>Researching options</option>
            </select>
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-slate-200">
          Primary goal
          <input
            className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-3 text-white outline-none transition focus:border-cyan-300"
            name="goal"
            required
            placeholder={
              isLeadRecovery
                ? "Example: book more estimates without adding office staff"
                : "Example: revive older tutorials and increase qualified search traffic"
            }
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-200">
          {isLeadRecovery ? "Current phone, CRM, and calendar tools" : "Analytics access available"}
          <input
            className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-3 text-white outline-none transition focus:border-cyan-300"
            name="tools"
            placeholder={isLeadRecovery ? "Example: RingCentral, Jobber, Google Calendar" : "Example: public URLs plus YouTube Studio screenshots"}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-200">
          Notes
          <textarea
            className="min-h-28 rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-300"
            name="notes"
            rows={4}
            placeholder="Add constraints, goals, or questions ILLCO should know before starting."
          />
        </label>

        <label className="flex items-start gap-3 text-xs leading-5 text-slate-400">
          <input className="mt-1 h-4 w-4 accent-cyan-300" type="checkbox" required />
          <span>I agree that ILLCO may contact me about this request. Submission does not create a contract or guarantee results.</span>
        </label>

        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
          {status === "submitting" ? "Saving intake..." : submitLabel}
        </button>

        {message ? (
          <div
            className={`rounded-lg border p-4 text-sm leading-6 ${
              status === "success"
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                : "border-rose-300/30 bg-rose-300/10 text-rose-100"
            }`}
            role="status"
          >
            <div className="flex items-start gap-2">
              {status === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : null}
              <span>{message}</span>
            </div>
            {status === "success" && checkoutHref ? (
              <a
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 font-semibold text-slate-950"
                href={checkoutHref}
              >
                Continue to secure checkout
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
