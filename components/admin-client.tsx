"use client";

import { type FormEvent, useEffect, useState } from "react";

import type { ProductRecord } from "@/lib/deployments";
import type { ProofAuditSnapshot } from "@/lib/proof-audit";

type PlanId = "core" | "studio" | "suite" | "agency" | "enterprise";

type AdminConfig = {
  subscriptionsReady: boolean;
  stripeWebhooksReady?: boolean;
  customerPortalReady?: boolean;
  licenseIssuingReady: boolean;
  manualLicenseValidationReady: boolean;
  leadCaptureReady: boolean;
  codexSdkReady?: boolean;
  googleOAuthReady?: boolean;
  planPrices: Record<PlanId, boolean>;
};

type Props = {
  products: ProductRecord[];
  config: AdminConfig;
  proofAudit: ProofAuditSnapshot;
};

type WatcherSnapshot = {
  generatedAt: string;
  checkIntervalMs: number;
  summary: {
    products: number;
    publicInFunnel: number;
    healthy: number;
    degraded: number;
    offline: number;
    proofReady: number;
    proofPending: number;
    blockers: number;
  };
  operationalSections: Array<{
    id: string;
    label: string;
    tone: "ready" | "warning" | "blocked" | "neutral";
    detail: string;
    metric: string;
    repairReason: string;
  }>;
  repairQueue: {
    count: number;
    queued: number;
    requests: Array<{
      id: string;
      sectionId: string;
      sectionLabel: string;
      reason: string;
      status: "queued";
      createdAt: string;
      updatedAt: string;
    }>;
  };
  blockers: string[];
  events: Array<{
    tone: string;
    label: string;
    detail: string;
    at: string;
  }>;
  capabilities: Array<{
    id: string;
    label: string;
    enabled: boolean;
    reason?: string;
  }>;
};

type AssistantMessage = {
  role: "assistant" | "operator";
  text: string;
};

async function fetchWatcherSnapshot() {
  const response = await fetch("/api/admin/watcher", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(response.status === 401 ? "Admin session required." : "Watcher could not load.");
  }
  return (await response.json()) as WatcherSnapshot;
}

const planLabels: Record<PlanId, string> = {
  core: "Core",
  studio: "Studio",
  suite: "Suite",
  agency: "Agency",
  enterprise: "Enterprise",
};

const priceEnvLabels: Record<PlanId, string> = {
  core: "STRIPE_PRICE_CORE_ID",
  studio: "STRIPE_PRICE_STUDIO_ID",
  suite: "STRIPE_PRICE_SUITE_ID",
  agency: "STRIPE_PRICE_AGENCY_ID",
  enterprise: "STRIPE_PRICE_ENTERPRISE_ID",
};

export function AdminClient({ products, config, proofAudit }: Props) {
  const [adminApiKey, setAdminApiKey] = useState("");
  const [issueResult, setIssueResult] = useState("");
  const [licenseResult, setLicenseResult] = useState("");
  const [portalResult, setPortalResult] = useState("");
  const [watcher, setWatcher] = useState<WatcherSnapshot | null>(null);
  const [watcherState, setWatcherState] = useState("Connecting watcher...");
  const [repairState, setRepairState] = useState<Record<string, string>>({});
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      text: "Admin assistant online. I can read the watcher, explain blockers, and guide guarded admin actions from this panel.",
    },
  ]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWatcher() {
      const payload = await fetchWatcherSnapshot();
      if (!cancelled) {
        setWatcher(payload);
        setWatcherState(`Updated ${new Date(payload.generatedAt).toLocaleTimeString()} / checks every 5 min`);
      }
    }

    loadWatcher().catch((error) => {
      if (!cancelled) setWatcherState(error instanceof Error ? error.message : "Watcher unavailable.");
    });
    const interval = window.setInterval(() => {
      loadWatcher().catch((error) => {
        if (!cancelled) setWatcherState(error instanceof Error ? error.message : "Watcher unavailable.");
      });
    }, 300000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  async function requestRepair(section: NonNullable<WatcherSnapshot["operationalSections"]>[number]) {
    setRepairState((current) => ({ ...current, [section.id]: "Sending repair request..." }));
    try {
      const response = await fetch("/api/admin/watcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: section.id,
          sectionLabel: section.label,
          reason: section.repairReason,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
        snapshot?: WatcherSnapshot;
      };
      if (!response.ok) {
        setRepairState((current) => ({ ...current, [section.id]: payload.detail || "Repair request failed." }));
        return;
      }
      if (payload.snapshot) {
        setWatcher(payload.snapshot);
        setWatcherState(`Updated ${new Date(payload.snapshot.generatedAt).toLocaleTimeString()} / checks every 5 min`);
      }
      setRepairState((current) => ({ ...current, [section.id]: "Queued in watcher." }));
    } catch {
      setRepairState((current) => ({ ...current, [section.id]: "Repair request failed." }));
    }
  }

  async function issueLicense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIssueResult("Issuing license...");
    const response = await fetch("/api/license/issue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-api-key": adminApiKey,
      },
      body: JSON.stringify({
        email: formData.get("email"),
        productId: formData.get("productId"),
        seats: Number(formData.get("seats") || 1),
        expiresAt: String(formData.get("expiresAt") || "") || null,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { licenseKey?: string; detail?: string };
    setIssueResult(payload.licenseKey || payload.detail || "License issue request finished without a response body.");
  }

  async function validateLicense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLicenseResult("Checking license...");
    const response = await fetch("/api/license/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey: formData.get("licenseKey") }),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; source?: string | null };
    setLicenseResult(`${payload.ok ? "Valid" : "Rejected"}: ${payload.message || "No response."}`);
  }

  async function openPortal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPortalResult("Creating portal session...");
    const response = await fetch("/api/subscriptions/portal", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "x-admin-api-key": adminApiKey,
      },
      body: JSON.stringify({ stripeCustomerId: formData.get("stripeCustomerId") }),
    });
    const payload = (await response.json().catch(() => ({}))) as { url?: string; detail?: string };
    if (response.ok && payload.url) {
      setPortalResult("Portal session ready. Opening Stripe...");
      window.location.href = payload.url;
      return;
    }
    setPortalResult(payload.detail || "Portal session could not be created.");
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = assistantInput.trim();
    if (!message || assistantBusy) return;

    setAssistantInput("");
    setAssistantBusy(true);
    setAssistantMessages((current) => [...current, { role: "operator", text: message }]);

    try {
      const response = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = (await response.json().catch(() => ({}))) as { reply?: string; detail?: string; snapshot?: WatcherSnapshot };
      if (payload.snapshot) {
        setWatcher(payload.snapshot);
        setWatcherState(`Updated ${new Date(payload.snapshot.generatedAt).toLocaleTimeString()}`);
      }
      setAssistantMessages((current) => [
        ...current,
        { role: "assistant", text: payload.reply || payload.detail || "Assistant request could not be completed." },
      ]);
    } catch {
      setAssistantMessages((current) => [
        ...current,
        { role: "assistant", text: "Assistant request could not be completed. Check the watcher and admin session." },
      ]);
    } finally {
      setAssistantBusy(false);
    }
  }

  return (
    <div className="commandShell">
      <aside className="sideRail" aria-label="Admin navigation">
        <a className="brandBlock" href="/" aria-label="ILLCO Command public funnel">
          <span className="brandGlyph">IC</span>
          <strong>ILLCO Admin</strong>
        </a>
        <nav className="railNav">
          <a href="/">Public Funnel</a>
          <a href="#watcher">Watcher</a>
          <a href="#operator-sections">App Sections</a>
          <a href="#assistant">Assistant</a>
          <a href="#license">Licenses</a>
          <a href="#billing">Billing</a>
          <a href="#proof">Proof Audit</a>
          <a href="#config">Config</a>
        </nav>
      </aside>

      <main className="workspace">
        <header className="topBar">
          <div>
            <h1>Operator Desk</h1>
            <p>Admin-only license, billing, and environment diagnostics for ILLCO Command.</p>
          </div>
        </header>

        <section className="adminOpsConsole">
          <div id="watcher" className="panel watcherPanel">
            <div className="panelHeader">
              <div>
                <h2>Watcher Window</h2>
                <p>Operator monitor for funnel health, monetization gates, proof coverage, repair requests, and config readiness. Auto-checks every 5 minutes.</p>
              </div>
              <span className="readinessPill neutral">{watcherState}</span>
            </div>
            {watcher ? (
              <>
                <div className="watcherStats">
                  <ConfigItem label="Products" ready detail={String(watcher.summary.products)} />
                  <ConfigItem label="Public funnel" ready detail={String(watcher.summary.publicInFunnel)} />
                  <ConfigItem label="Healthy" ready={watcher.summary.healthy > 0} detail={String(watcher.summary.healthy)} />
                  <ConfigItem label="Degraded" ready={watcher.summary.degraded === 0} detail={String(watcher.summary.degraded)} />
                  <ConfigItem label="Offline" ready={watcher.summary.offline === 0} detail={String(watcher.summary.offline)} />
                  <ConfigItem label="Proof pending" ready={watcher.summary.proofPending === 0} detail={String(watcher.summary.proofPending)} />
                </div>
                <div className="watcherEvents">
                  {watcher.events.map((event) => (
                    <article className="watcherEvent" key={`${event.label}-${event.at}`}>
                      <span className={`statusDot ${event.tone === "ready" ? "ready" : ""}`} />
                      <div>
                        <strong>{event.label}</strong>
                        <p>{event.detail}</p>
                        <small>{new Date(event.at).toLocaleString()}</small>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="repairQueueBox" aria-label="Repair queue">
                  <div className="repairQueueHeader">
                    <strong>Repair Queue</strong>
                    <span>{watcher.repairQueue.queued} queued</span>
                  </div>
                  {watcher.repairQueue.requests.length ? (
                    <div className="repairQueueList">
                      {watcher.repairQueue.requests.slice(0, 8).map((request) => (
                        <article className="repairQueueItem" key={request.id}>
                          <div>
                            <strong>{request.sectionLabel}</strong>
                            <p>{request.reason}</p>
                          </div>
                          <small>{new Date(request.createdAt).toLocaleString()}</small>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="repairQueueEmpty">No repair requests queued.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="resultBox">{watcherState}</div>
            )}
          </div>

          <div id="assistant" className="panel assistantPanel">
            <div className="panelHeader">
              <div>
                <h2>Admin Assistant Agent</h2>
                <p>Reads the watcher and guides guarded admin actions. Production deploys remain root-only.</p>
              </div>
            </div>
            <div className="assistantCapabilityGrid">
              {(watcher?.capabilities || []).map((capability) => (
                <div className="assistantCapability" key={capability.id}>
                  <span className={capability.enabled ? "statusDot ready" : "statusDot"} />
                  <strong>{capability.label}</strong>
                  <small>{capability.enabled ? "Enabled" : capability.reason || "Unavailable"}</small>
                </div>
              ))}
            </div>
            <div className="assistantTranscript" aria-live="polite">
              {assistantMessages.map((message, index) => (
                <div className={`assistantBubble ${message.role}`} key={`${message.role}-${index}`}>
                  <strong>{message.role === "operator" ? "Operator" : "Assistant"}</strong>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>
            <form className="assistantAskForm" onSubmit={askAssistant}>
              <input
                value={assistantInput}
                onChange={(event) => setAssistantInput(event.target.value)}
                placeholder="Ask about blockers, licenses, demos, health, deploy readiness..."
              />
              <button className="button primary" type="submit" disabled={assistantBusy || !assistantInput.trim()}>
                Ask
              </button>
            </form>
          </div>
        </section>

        <section id="operator-sections" className="panel operatorSectionPanel">
          <div className="panelHeader">
            <div>
              <h2>App Sections</h2>
              <p>Every major ILLCO surface is split for operator review. Repair sends the request into the watcher queue.</p>
            </div>
            <span className="readinessPill neutral">Watcher checks every 5 min</span>
          </div>
          {watcher?.operationalSections.length ? (
            <div className="operatorSectionGrid">
              {watcher.operationalSections.map((section) => (
                <article className={`operatorSectionCard ${section.tone}`} key={section.id}>
                  <div className="operatorSectionHead">
                    <div>
                      <span>{section.metric}</span>
                      <strong>{section.label}</strong>
                    </div>
                    <span className={`statusDot ${section.tone === "ready" ? "ready" : ""}`} />
                  </div>
                  <p>{section.detail}</p>
                  <div className="operatorRepairRow">
                    <button className="button secondary" type="button" onClick={() => requestRepair(section)}>
                      Request Repair
                    </button>
                    {repairState[section.id] ? <small>{repairState[section.id]}</small> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="resultBox">{watcherState}</div>
          )}
        </section>

        <section className="panel adminGate">
          <div className="panelHeader">
            <div>
              <h2>Admin Key</h2>
              <p>Actions require the configured server-side ADMIN_API_KEY through the x-admin-api-key header.</p>
            </div>
          </div>
          <label className="adminKeyField">
            Operator key
            <input
              value={adminApiKey}
              onChange={(event) => setAdminApiKey(event.target.value)}
              type="password"
              autoComplete="off"
              placeholder="Paste admin key for this session"
            />
          </label>
        </section>

        <section className="opsGrid">
          <div id="license" className="panel">
            <div className="panelHeader">
              <div>
                <h2>Issue License</h2>
                <p>Creates a signed license for a known product and customer email.</p>
              </div>
            </div>
            <form onSubmit={issueLicense} className="formStack">
              <label>
                Customer email
                <input name="email" type="email" required />
              </label>
              <label>
                Product
                <select name="productId" defaultValue={products[0]?.id}>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Seats
                <input name="seats" type="number" min="1" defaultValue="1" required />
              </label>
              <label>
                Expiration
                <input name="expiresAt" type="datetime-local" />
              </label>
              <button className="button primary" type="submit" disabled={!adminApiKey}>
                Issue License
              </button>
              {issueResult ? <output className="resultBox">{issueResult}</output> : null}
            </form>

            <form onSubmit={validateLicense} className="formStack compactForm">
              <label>
                Validate license key
                <input name="licenseKey" required />
              </label>
              <button className="button secondary" type="submit">Validate</button>
              {licenseResult ? <output className="resultBox">{licenseResult}</output> : null}
            </form>
          </div>

          <div id="billing" className="panel">
            <div className="panelHeader">
              <div>
                <h2>Billing Portal</h2>
                <p>Admin-only Stripe portal lookup. Public customers never enter a Stripe customer id.</p>
              </div>
            </div>
            <form onSubmit={openPortal} className="formStack">
              <label>
                Stripe customer id
                <input name="stripeCustomerId" placeholder="cus_..." required />
              </label>
              <button className="button primary" type="submit" disabled={!adminApiKey}>
                Open Billing Portal
              </button>
              {portalResult ? <output className="resultBox">{portalResult}</output> : null}
            </form>
          </div>
        </section>

        <section id="proof" className="panel settingsPanel">
          <div className="panelHeader">
            <div>
              <h2>Proof Audit</h2>
              <p>Operator view of which public offers have fast proof, which still rely on walkthroughs, and which need real result evidence.</p>
            </div>
          </div>
          <div className="proofAuditStats">
            <ConfigItem label="Public offers" ready={proofAudit.summary.publicOffers > 0} detail={String(proofAudit.summary.publicOffers)} />
            <ConfigItem label="Proof ready" ready={proofAudit.summary.proofReady > 0} detail={String(proofAudit.summary.proofReady)} />
            <ConfigItem label="Proof pending" ready={proofAudit.summary.proofPending === 0} detail={String(proofAudit.summary.proofPending)} />
            <ConfigItem label="Fast demos" ready={proofAudit.summary.fastDemoReady > 0} detail={String(proofAudit.summary.fastDemoReady)} />
            <ConfigItem label="Walkthrough only" ready={proofAudit.summary.walkthroughOnly === 0} detail={String(proofAudit.summary.walkthroughOnly)} />
            <ConfigItem label="Result-proof required" ready={proofAudit.summary.resultProofRequired === proofAudit.summary.resultProofReady} detail={`${proofAudit.summary.resultProofReady}/${proofAudit.summary.resultProofRequired}`} />
          </div>
          <div className="proofAuditList" aria-label="Proof audit rows">
            {proofAudit.rows.map((row) => (
              <article className="proofAuditCard" key={row.productId}>
                <div className="proofAuditHeader">
                  <div>
                    <strong>{row.displayName}</strong>
                    <small>{row.productId}</small>
                  </div>
                  <span className={`readinessPill ${row.proofReady ? "ready" : row.needsResultProof ? "pending" : "neutral"}`}>
                    {row.proofLabel}
                  </span>
                </div>
                <div className="proofAuditSignals">
                  <ProofSignal label="Primary" value={row.primaryMode || "none"} />
                  <ProofSignal label="Quick demo" value={row.hasQuickDemo ? "yes" : "no"} />
                  <ProofSignal label="Walkthrough" value={row.hasWalkthrough ? "yes" : "no"} />
                  <ProofSignal label="Result proof" value={row.hasResultProof ? "yes" : row.needsResultProof ? "needed" : "n/a"} />
                </div>
                <p>{row.proofDetail}</p>
                {row.productionUrl ? (
                  <a className="button secondary" href={row.productionUrl} target="_blank" rel="noreferrer">
                    Open route
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section id="config" className="panel settingsPanel">
          <div className="panelHeader">
            <div>
              <h2>Configuration</h2>
              <p>Operator diagnostics for runtime setup. Keep this surface out of public navigation.</p>
            </div>
          </div>
          <div className="configGrid">
            <ConfigItem label="STRIPE_SECRET_KEY" ready={config.subscriptionsReady} />
            <ConfigItem label="STRIPE_WEBHOOK_SECRET" ready={Boolean(config.stripeWebhooksReady)} />
            <ConfigItem label="CHECKOUT_SESSION_SECRET" ready={Boolean(config.customerPortalReady)} />
            <ConfigItem label="ADMIN_API_KEY + LICENSE_SIGNING_SECRET" ready={config.licenseIssuingReady} />
            <ConfigItem label="MASTER_LICENSE_KEY or LICENSE_KEYS" ready={config.manualLicenseValidationReady} />
            <ConfigItem label="DATABASE_URL / POSTGRES_URL / LEAD_WEBHOOK_URL (or BETA_SIGNUP_WEBHOOK_URL)" ready={config.leadCaptureReady} />
            <ConfigItem label="CODEX_API_KEY or OPENAI_API_KEY" ready={Boolean(config.codexSdkReady)} />
            {Object.entries(config.planPrices).map(([planId, ready]) => (
              <ConfigItem
                key={planId}
                label={`${planLabels[planId as PlanId]}: ${priceEnvLabels[planId as PlanId]}`}
                ready={ready}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function ConfigItem({ label, ready, detail }: { label: string; ready: boolean; detail?: string }) {
  return (
    <div className="configItem">
      <span className={ready ? "statusDot ready" : "statusDot"} />
      <strong>{label}</strong>
      <small>{detail || (ready ? "Ready" : "Missing")}</small>
    </div>
  );
}

function ProofSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="signalItem">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
