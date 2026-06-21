"use client";

import { type FormEvent, useEffect, useState } from "react";

type FeedbackItem = {
  id: string;
  message: string;
  agentReply: string;
  actionItems: string[];
  createdAt: string;
};

type FeedbackSnapshot = {
  count: number;
  items: FeedbackItem[];
};

export function ShaylaFeedbackClient() {
  const [snapshot, setSnapshot] = useState<FeedbackSnapshot | null>(null);
  const [status, setStatus] = useState("Connecting Shayla watcher...");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadFeedback() {
    const response = await fetch("/api/shayla-feedback", { cache: "no-store" });
    if (!response.ok) throw new Error("Feedback watcher unavailable.");
    const payload = (await response.json()) as FeedbackSnapshot;
    setSnapshot(payload);
    setStatus(`Updated ${new Date().toLocaleTimeString()} / next check in 5 minutes`);
  }

  useEffect(() => {
    let cancelled = false;
    async function guardedLoad() {
      try {
        await loadFeedback();
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "Feedback watcher unavailable.");
      }
    }
    guardedLoad();
    const interval = window.setInterval(guardedLoad, 300000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setStatus("Sending feedback through Shayla agent...");
    try {
      const response = await fetch("/api/shayla-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "vault-select-exclusive-trap-beat", message: text }),
      });
      const payload = (await response.json()) as { snapshot?: FeedbackSnapshot; detail?: string };
      if (!response.ok || !payload.snapshot) throw new Error(payload.detail || "Feedback could not be saved.");
      setMessage("");
      setSnapshot(payload.snapshot);
      setStatus(`Saved ${new Date().toLocaleTimeString()} / next automatic check in 5 minutes`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Feedback could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fallbackPage shaylaFeedbackPage">
      <main className="workspace">
        <nav className="appLandingNav" aria-label="Shayla feedback navigation">
          <a className="brandBlock" href="/">
            <span className="brandGlyph">IC</span>
            <strong>ILLCO Command</strong>
          </a>
          <div>
            <a className="button secondary" href="/apps/vault-select-exclusive-trap-beat">Music Product</a>
            <a className="button secondary" href="/admin">Admin</a>
          </div>
        </nav>

        <section className="panel shaylaFeedbackHero">
          <div>
            <span className="readinessPill ready">Shayla feedback agent</span>
            <h1>Creative Watcher Window</h1>
            <p>Drop direct creative notes here. The watcher checks every 5 minutes and turns feedback into action items for the next video or product visual pass.</p>
          </div>
          <div className="feedbackPulse" aria-hidden="true">
            <span />
            <strong>5 min</strong>
            <em>watch loop</em>
          </div>
        </section>

        <section className="shaylaFeedbackGrid">
          <form className="panel shaylaFeedbackForm" onSubmit={submitFeedback}>
            <div className="panelHeader">
              <div>
                <h2>Send Feedback</h2>
                <p>Use direct notes like: make it pop with a mic or boombox, center the text, fix the backing.</p>
              </div>
            </div>
            <label className="field">
              <span>Shayla note</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={7}
                placeholder="The current image is too flat. Use a mic or boombox and make it pop up."
              />
            </label>
            <button className="button primary" type="submit" disabled={busy}>
              {busy ? "Sending..." : "Send to Agent"}
            </button>
            <p className="feedbackStatus">{status}</p>
          </form>

          <section className="panel shaylaFeedbackFeed" aria-label="Shayla feedback feed">
            <div className="panelHeader">
              <div>
                <h2>Watcher Feed</h2>
                <p>Latest feedback and action items for the operator.</p>
              </div>
              <span className="readinessPill neutral">{snapshot?.count || 0} notes</span>
            </div>
            {snapshot?.items.length ? (
              <div className="feedbackItems">
                {snapshot.items.map((item) => (
                  <article className="feedbackItem" key={item.id}>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    <strong>{item.message}</strong>
                    <p>{item.agentReply}</p>
                    <ul>
                      {item.actionItems.map((action) => <li key={action}>{action}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <div className="accountNote">
                <strong>No feedback yet</strong>
                <span>Send the first note to start the watcher loop.</span>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
