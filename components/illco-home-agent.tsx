"use client";

import { FormEvent, useState } from "react";
import styles from "./illco-home-agent.module.css";

type AgentResponse = {
  ok: boolean;
  route?: {
    id: string;
    name: string;
    description: string;
    launchHref: string;
    mcpUrl: string | null;
    widgetUrl: string | null;
    tools: string[];
    status: "live" | "partial" | "external";
    score: number;
    evidence: string[];
  } | null;
  alternatives?: Array<{
    id: string;
    name: string;
    description: string;
    launchHref: string;
    status: "live" | "partial" | "external";
    score: number;
  }>;
  catalog?: {
    summary: string;
    recommendations: Array<{
      id: string;
      name: string;
      summary: string;
      detailsHref: string;
      openHref: string | null;
      canOpen: boolean;
      canCheckout: boolean;
      reason: string;
    }>;
  };
};

const quickPrompts = [
  "Make a branded chase video",
  "Fact-check a podcast debate",
  "Build a lyric video from my song",
  "Create a viral meme",
  "Plan and launch a project",
  "Fix a GitHub project",
];

export function IllcoHomeAgent() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAgent(input: string) {
    const next = input.trim();
    if (!next || loading) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/illco-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: next }),
      });
      const data = (await response.json()) as AgentResponse & { detail?: string };
      if (!response.ok) throw new Error(data.detail || "Agent routing failed.");
      setResult(data);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "Agent routing failed.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAgent(message);
  }

  const route = result?.route;

  return (
    <section className={styles.shell} aria-label="iLLCo Agent command center">
      <div className={styles.glowA} />
      <div className={styles.glowB} />
      <div className={styles.inner}>
        <div className={styles.intro}>
          <div className={styles.kicker}><span className={styles.liveDot} /> iLLCo Agent · Home Command</div>
          <h1>Tell iLLCo what you want done.</h1>
          <p>
            One command routes you into the right iLLCo engine, MCP server, widget, connected service,
            or product without making you hunt through the catalog first.
          </p>
          <div className={styles.stats}>
            <span><strong>14</strong> routed capability groups</span>
            <span><strong>4</strong> native iLLCo MCP apps</span>
            <span><strong>1</strong> command surface</span>
          </div>
        </div>

        <div className={styles.agentCard}>
          <form onSubmit={submit} className={styles.form}>
            <label htmlFor="illco-home-agent-input">What do you want to accomplish?</label>
            <div className={styles.inputRow}>
              <textarea
                id="illco-home-agent-input"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Example: Take this YouTube debate, transcribe it, fact-check the major claims, and open the evidence studio."
                rows={3}
              />
              <button type="submit" disabled={loading || !message.trim()}>
                {loading ? "Routing…" : "Run Agent"}
              </button>
            </div>
          </form>

          <div className={styles.quickPrompts} aria-label="Quick agent prompts">
            {quickPrompts.map((prompt) => (
              <button
                type="button"
                key={prompt}
                onClick={() => {
                  setMessage(prompt);
                  void runAgent(prompt);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          {route ? (
            <div className={styles.result}>
              <div className={styles.resultTop}>
                <div>
                  <span className={`${styles.status} ${styles[route.status]}`}>{route.status}</span>
                  <h2>{route.name}</h2>
                  <p>{route.description}</p>
                </div>
                <a className={styles.launch} href={route.launchHref}>Open {route.name}</a>
              </div>

              <div className={styles.toolStrip}>
                {route.tools.slice(0, 6).map((tool) => <span key={tool}>{tool}</span>)}
              </div>

              {(route.mcpUrl || route.widgetUrl) ? (
                <details className={styles.details}>
                  <summary>Connection details</summary>
                  {route.mcpUrl ? <code>{route.mcpUrl}</code> : null}
                  {route.widgetUrl ? <code>{route.widgetUrl}</code> : null}
                </details>
              ) : null}

              {result?.alternatives?.some((item) => item.score > 0) ? (
                <div className={styles.altRow}>
                  <strong>Also relevant</strong>
                  {result.alternatives.filter((item) => item.score > 0).map((item) => (
                    <a key={item.id} href={item.launchHref}>{item.name}</a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className={styles.idleGrid}>
              <article><strong>CREATE</strong><span>Video · Voice · Memes · Lyrics</span></article>
              <article><strong>ANALYZE</strong><span>Debates · Claims · Transcripts · Data</span></article>
              <article><strong>BUILD</strong><span>Apps · Projects · Automations · Websites</span></article>
              <article><strong>OPERATE</strong><span>GitHub · Drive · Notion · Stripe · Ads</span></article>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
