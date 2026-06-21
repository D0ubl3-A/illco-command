"use client";

import { type FormEvent, useMemo, useState } from "react";

type MasterAgentRecommendation = {
  id: string;
  productId: string;
  offerId: string | null;
  name: string;
  category: string;
  summary: string;
  statusLabel: string;
  accessLabel: string;
  planLabel: string;
  proofLabel: string;
  detailsHref: string;
  requestHref: string;
  openHref: string | null;
  imagePath: string;
  canOpen: boolean;
  canCheckout: boolean;
  reason: string;
  score: number;
  evidence: string[];
};

type MasterAgentResponse = {
  ok?: boolean;
  mode?: string;
  summary?: string;
  inventory?: {
    apps: number;
    saleableOffers: number;
    catalogItems: number;
    openNow: number;
    setupAvailable: number;
    comingSoon: number;
    paymentsReady: boolean;
    googleOAuthReady: boolean;
  };
  actions?: Array<{
    label: string;
    href: string;
    kind: string;
  }>;
  recommendations?: MasterAgentRecommendation[];
  nextSteps?: string[];
  guardrails?: string[];
  detail?: string;
};

const modeOptions = [
  { value: "route", label: "Route" },
  { value: "sell", label: "Sell" },
  { value: "support", label: "Support" },
  { value: "build", label: "Build" },
  { value: "admin", label: "Admin" },
];

export function MasterAgentPanel() {
  const [message, setMessage] = useState("I need lead rescue, Gmail, LinkedIn, and subscriptions to work for real users.");
  const [mode, setMode] = useState("route");
  const [result, setResult] = useState<MasterAgentResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const inventory = result?.inventory;
  const recommendations = useMemo(() => result?.recommendations || [], [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/master-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mode }),
      });
      const payload = (await response.json().catch(() => ({}))) as MasterAgentResponse;
      if (!response.ok) {
        setError(payload.detail || "Master Agent could not route that request.");
      } else {
        setResult(payload);
      }
    } catch {
      setError("Master Agent is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="masterAgentShell">
      <section className="panel masterAgentHero" aria-labelledby="master-agent-title">
        <div>
          <span className="readinessPill ready">Catalog agent</span>
          <h1 id="master-agent-title">Master Agent</h1>
          <p>
            One interface for routing buyers, users, and operators to the correct ILLCO app, tool, setup request, or account path.
          </p>
        </div>
        <div className="masterAgentSystemCard">
          <strong>Safe routing rules</strong>
          <span>Locked products stay on app landing pages.</span>
          <span>Open links appear only when access gates pass.</span>
          <span>OAuth and subscriptions stay under the user account route.</span>
        </div>
      </section>

      <section className="panel masterAgentConsole" aria-label="Master Agent console">
        <form className="masterAgentForm" onSubmit={submit}>
          <label>
            Request
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} />
          </label>
          <div className="masterAgentModes" role="radiogroup" aria-label="Agent mode">
            {modeOptions.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="masterAgentMode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={(event) => setMode(event.target.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <button className="button primary" type="submit" disabled={isLoading}>
            {isLoading ? "Routing..." : "Route Request"}
          </button>
        </form>

        <div className="masterAgentOutput" aria-live="polite">
          {error ? <div className="resultBox">{error}</div> : null}
          {result ? (
            <>
              <div className="masterAgentSummary">
                <strong>{result.summary}</strong>
                <span>Mode: {result.mode}</span>
              </div>

              {inventory ? (
                <div className="masterAgentStats">
                  <Stat label="Apps" value={String(inventory.apps)} />
                  <Stat label="Offers" value={String(inventory.saleableOffers)} />
                  <Stat label="Open now" value={String(inventory.openNow)} />
                  <Stat label="Setup" value={String(inventory.setupAvailable)} />
                  <Stat label="Coming soon" value={String(inventory.comingSoon)} />
                  <Stat label="Google OAuth" value={inventory.googleOAuthReady ? "Ready" : "Missing"} />
                </div>
              ) : null}

              {result.actions?.length ? (
                <div className="masterAgentActions">
                  {result.actions.map((action) => (
                    <a className="button secondary" href={action.href} key={`${action.kind}-${action.href}`}>
                      {action.label}
                    </a>
                  ))}
                </div>
              ) : null}

              <div className="masterAgentRecommendations">
                {recommendations.map((item) => (
                  <article className="masterAgentCard" key={item.id}>
                    <img src={item.imagePath} alt={`${item.name} product preview`} loading="lazy" />
                    <div className="masterAgentCardBody">
                      <span>{item.category}</span>
                      <strong>{item.name}</strong>
                      <p>{item.summary}</p>
                      <div className="masterAgentCardFacts">
                        <small>{item.statusLabel}</small>
                        <small>{item.accessLabel}</small>
                        <small>{item.planLabel}</small>
                        <small>{item.proofLabel}</small>
                      </div>
                      <em>{item.reason}</em>
                      <div className="masterAgentEvidence">
                        {item.evidence.map((entry) => (
                          <span key={`${item.id}-${entry}`}>{entry}</span>
                        ))}
                      </div>
                      <div className="masterAgentCardActions">
                        {item.openHref ? (
                          <a className="button primary" href={item.openHref} target={item.openHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                            Open
                          </a>
                        ) : (
                          <a className="button primary" href={item.detailsHref}>
                            Details
                          </a>
                        )}
                        <a className="button secondary" href={item.requestHref}>
                          Request
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="masterAgentGuidance">
                <GuidanceList title="Next steps" items={result.nextSteps || []} />
                <GuidanceList title="Guardrails" items={result.guardrails || []} />
              </div>
            </>
          ) : (
            <div className="accountNote">
              <strong>Ready</strong>
              <span>Enter a buyer, support, build, or admin request and the agent will return the safest working route.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="factCard neutral">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function GuidanceList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <div className="accountNote">
      <strong>{title}</strong>
      <ol>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ol>
    </div>
  );
}
