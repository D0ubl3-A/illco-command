"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

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

type MasterAgentPopupState = {
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  cta: string;
  external: boolean;
};

const modeOptions = [
  { value: "route", label: "Route", note: "Best path" },
  { value: "sell", label: "Sell", note: "Buyer flow" },
  { value: "support", label: "Support", note: "Account help" },
  { value: "build", label: "Build", note: "Setup queue" },
  { value: "admin", label: "Admin", note: "Ops view" },
];

const promptPresets = [
  "Sell YouTube Ops to a creator who wants metadata repair, scheduling, and billing handled in one place.",
  "Route a lead-rescue buyer who needs Gmail, LinkedIn, subscriptions, and a working checkout path.",
  "Support a Studio user who paid but cannot open their product or manage billing.",
  "Admin audit: show which apps can open now, which need setup, and which are blocked by proof.",
];

const idleStats = [
  { label: "Routing", value: "Live" },
  { label: "Payments", value: "Guarded" },
  { label: "OAuth", value: "Account" },
  { label: "Access", value: "Gated" },
];

export function MasterAgentPanel() {
  const [message, setMessage] = useState("I need lead rescue, Gmail, LinkedIn, and subscriptions to work for real users.");
  const [mode, setMode] = useState("route");
  const [result, setResult] = useState<MasterAgentResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [popup, setPopup] = useState<MasterAgentPopupState | null>(null);

  const inventory = result?.inventory;
  const recommendations = useMemo(() => result?.recommendations || [], [result]);
  const openRate = inventory?.catalogItems ? Math.round((inventory.openNow / inventory.catalogItems) * 100) : 0;
  const setupRate = inventory?.catalogItems ? Math.round((inventory.setupAvailable / inventory.catalogItems) * 100) : 0;
  const lockedCount = inventory ? Math.max(0, inventory.catalogItems - inventory.openNow - inventory.setupAvailable) : 0;

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

  useEffect(() => {
    if (!popup) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPopup(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [popup]);

  function openPopup(popupState: MasterAgentPopupState) {
    setPopup(popupState);
  }

  function closePopup() {
    setPopup(null);
  }

  return (
    <div className="masterAgentShell">
      <section className="masterAgentHero" aria-labelledby="master-agent-title">
        <div className="masterAgentHeroCopy">
          <span className="readinessPill ready">ILLCO command layer</span>
          <h1 id="master-agent-title">Master Agent</h1>
          <p>Route every buyer, user, admin, and build request through one gated ILLCO control surface.</p>
          <div className="masterAgentHeroActions" aria-label="Primary agent destinations">
            <a className="button primary" href="/#apps">Browse Apps</a>
            <a className="button secondary" href="/account">Account</a>
            <a className="button secondary" href="/admin?panel=watcher#watcher">Admin Watcher</a>
          </div>
        </div>
        <div className="masterAgentStatusBoard" aria-label="Master Agent readiness">
          {(inventory
            ? [
                { label: "Catalog", value: String(inventory.catalogItems) },
                { label: "Open", value: String(inventory.openNow) },
                { label: "Setup", value: String(inventory.setupAvailable) },
                { label: "OAuth", value: inventory.googleOAuthReady ? "Ready" : "Missing" },
              ]
            : idleStats
          ).map((item) => (
            <div className="masterAgentMiniStat" key={`${item.label}-${item.value}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="masterAgentWorkbench" aria-label="Master Agent console">
        <aside className="masterAgentCommandPanel">
          <form className="masterAgentForm" onSubmit={submit}>
            <label>
              Request
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={7} />
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
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.note}</small>
                  </span>
                </label>
              ))}
            </div>
            <button className="button primary masterAgentSubmit" type="submit" disabled={isLoading}>
              {isLoading ? "Routing" : "Run Master Agent"}
            </button>
          </form>

          <div className="masterAgentPresetStack" aria-label="Preset requests">
            {promptPresets.map((preset, index) => (
              <button className="masterAgentPreset" type="button" key={preset} onClick={() => setMessage(preset)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{preset}</strong>
              </button>
            ))}
          </div>
        </aside>

        <div className="masterAgentOutput" aria-live="polite">
          {error ? <div className="resultBox">{error}</div> : null}
          {result ? (
            <>
              <div className="masterAgentResultHeader">
                <div>
                  <span className="readinessPill neutral">{result.mode || "route"}</span>
                  <h2>{result.summary || "Route ready"}</h2>
                </div>
                <div className="masterAgentHealthGrid" aria-label="Inventory health">
                  <Meter label="Open" value={openRate} detail={`${inventory?.openNow || 0} live`} />
                  <Meter label="Setup" value={setupRate} detail={`${inventory?.setupAvailable || 0} queued`} />
                  <Meter label="Locked" value={inventory?.catalogItems ? Math.round((lockedCount / inventory.catalogItems) * 100) : 0} detail={`${lockedCount} held`} />
                </div>
              </div>

              {inventory ? (
                <div className="masterAgentStats">
                  <Stat label="Apps" value={String(inventory.apps)} tone="neutral" />
                  <Stat label="Offers" value={String(inventory.saleableOffers)} tone="neutral" />
                  <Stat label="Catalog" value={String(inventory.catalogItems)} tone="neutral" />
                  <Stat label="Payments" value={inventory.paymentsReady ? "Ready" : "Missing"} tone={inventory.paymentsReady ? "good" : "warn"} />
                  <Stat label="Google" value={inventory.googleOAuthReady ? "Ready" : "Missing"} tone={inventory.googleOAuthReady ? "good" : "warn"} />
                  <Stat label="Coming" value={String(inventory.comingSoon)} tone="neutral" />
                </div>
              ) : null}

              {result.actions?.length ? (
                <div className="masterAgentActions">
                  {result.actions.map((action) => (
                    <button
                      className="button secondary"
                      type="button"
                      key={`${action.kind}-${action.href}`}
                      onClick={() =>
                        openPopup({
                          title: "Master Agent action",
                          eyebrow: action.kind,
                          description: action.label,
                          href: action.href,
                          cta: action.label,
                          external: action.href.startsWith("http"),
                        })
                      }
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="masterAgentRecommendations">
                {recommendations.map((item, index) => (
                  <article className="masterAgentCard" key={item.id}>
                    <div className="masterAgentMediaFrame">
                      <img src={item.imagePath} alt={`${item.name} product preview`} loading="lazy" />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="masterAgentCardBody">
                      <div className="masterAgentCardTopline">
                        <span>{item.category}</span>
                        <small className={item.canOpen ? "isOpen" : item.canCheckout ? "isCheckout" : "isLocked"}>
                          {item.canOpen ? "Open" : item.canCheckout ? "Checkout" : "Gated"}
                        </small>
                      </div>
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
                          <button
                            className="button primary"
                            type="button"
                            onClick={() => {
                              const openHref = item.openHref || item.detailsHref;
                              openPopup({
                                title: item.name,
                                eyebrow: "Open",
                                description: item.summary,
                                href: openHref,
                                cta: "Open",
                                external: openHref.startsWith("http"),
                              });
                            }}
                          >
                            Open
                          </button>
                        ) : (
                          <button
                            className="button primary"
                            type="button"
                            onClick={() =>
                              openPopup({
                                title: item.name,
                                eyebrow: "Details",
                                description: item.summary,
                                href: item.detailsHref,
                                cta: "Details",
                                external: item.detailsHref.startsWith("http"),
                              })
                            }
                          >
                            Details
                          </button>
                        )}
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() =>
                            openPopup({
                              title: item.name,
                              eyebrow: "Request",
                              description: item.reason,
                              href: item.requestHref,
                              cta: "Request",
                              external: item.requestHref.startsWith("http"),
                            })
                          }
                        >
                          Request
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {popup ? (
                <div className="masterAgentPopupBackdrop" role="presentation" onClick={closePopup}>
                  <div className="masterAgentPopup" role="dialog" aria-modal="true" aria-labelledby="master-agent-popup-title" aria-describedby="master-agent-popup-copy" onClick={(event) => event.stopPropagation()}>
                    <span className="readinessPill neutral">{popup.eyebrow}</span>
                    <h2 id="master-agent-popup-title">{popup.title}</h2>
                    <p id="master-agent-popup-copy">{popup.description}</p>
                    <div className="masterAgentPopupActions">
                      <button className="button secondary" type="button" onClick={closePopup}>
                        Close
                      </button>
                      <a className="button primary" href={popup.href} target={popup.external ? "_blank" : undefined} rel={popup.external ? "noreferrer" : undefined}>
                        {popup.cta}
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="masterAgentGuidance">
                <GuidanceList title="Next steps" items={result.nextSteps || []} />
                <GuidanceList title="Guardrails" items={result.guardrails || []} />
              </div>
            </>
          ) : (
            <div className="masterAgentIdleState">
              <span className="readinessPill neutral">Standby</span>
              <strong>Ready for routing.</strong>
              <p>Use a preset or write a request. The agent will return working routes, locked routes, setup paths, and account actions from the live catalog.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Meter({ label, value, detail }: { label: string; value: number; detail: string }) {
  const bounded = Math.min(100, Math.max(0, value));
  return (
    <div className="masterAgentMeter">
      <div>
        <span>{label}</span>
        <strong>{bounded}%</strong>
      </div>
      <div className="masterAgentMeterTrack" aria-hidden="true">
        <span style={{ width: `${bounded}%` }} />
      </div>
      <small>{detail}</small>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "neutral" }) {
  return (
    <div className={`factCard ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function GuidanceList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <div className="accountNote masterAgentGuidanceList">
      <strong>{title}</strong>
      <ol>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ol>
    </div>
  );
}
