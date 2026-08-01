"use client";

import { FormEvent, useEffect, useState } from "react";

import styles from "./autotube.module.css";

type RenderState = {
  jobId: string;
  status: string;
  progress: number;
  stage?: string;
  statusUrl: string;
  videoUrl: string;
  downloadUrl: string;
  ready?: boolean;
  error?: string;
  message?: string;
  output?: Record<string, unknown>;
};

const initialForm = {
  prospect: "",
  offer: "AI lead intake and immediate follow-up",
  painPoint: "after-hours inquiries wait too long for a response",
  callToAction: "Book a ten-minute workflow review with iLLCo AI.",
  durationSeconds: 30,
};

function isReady(status: string) {
  return ["ready", "completed", "complete", "succeeded"].includes(status.toLowerCase());
}

export function AutoTubeProductionClient() {
  const [form, setForm] = useState(initialForm);
  const [job, setJob] = useState<RenderState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!job?.statusUrl || isReady(job.status) || job.status === "failed") return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(job.statusUrl, { cache: "no-store" });
        const payload = (await response.json()) as RenderState & { ok?: boolean };
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.message || "Unable to read render status.");
        }
        setJob((current) => (current ? { ...current, ...payload } : payload));
      } catch (pollError) {
        setError(pollError instanceof Error ? pollError.message : "Status check failed.");
      }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [job]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setJob(null);
    try {
      const response = await fetch("/api/autotube/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect: form.prospect,
          offer: form.offer,
          pain_point: form.painPoint,
          call_to_action: form.callToAction,
          duration_seconds: Number(form.durationSeconds),
          aspect_ratio: "landscape",
          brand_colors: ["#061A17", "#16E0A5"],
        }),
      });
      const payload = (await response.json()) as RenderState & { ok?: boolean };
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.message || "AutoTube did not start.");
      }
      setJob(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "AutoTube did not start.");
    } finally {
      setSubmitting(false);
    }
  }

  const progress = Math.max(0, Math.min(100, Number(job?.progress || 0)));
  const ready = Boolean(job && (job.ready || isReady(job.status)));

  return (
    <section className={styles.console}>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.formHeading}>
          <div>
            <span>Production request</span>
            <h2>Create one complete prospect video</h2>
          </div>
          <strong>Browser encoding disabled</strong>
        </div>

        <label>
          Prospect or company
          <input
            required
            maxLength={140}
            value={form.prospect}
            onChange={(event) => setForm({ ...form, prospect: event.target.value })}
            placeholder="Dan's Tax LV"
          />
        </label>
        <label>
          Offer shown in the video
          <textarea
            required
            maxLength={500}
            value={form.offer}
            onChange={(event) => setForm({ ...form, offer: event.target.value })}
          />
        </label>
        <label>
          Operational pain point
          <textarea
            required
            maxLength={500}
            value={form.painPoint}
            onChange={(event) => setForm({ ...form, painPoint: event.target.value })}
          />
        </label>
        <label>
          Final call to action
          <input
            required
            maxLength={220}
            value={form.callToAction}
            onChange={(event) => setForm({ ...form, callToAction: event.target.value })}
          />
        </label>
        <label>
          Target duration
          <select
            value={form.durationSeconds}
            onChange={(event) =>
              setForm({ ...form, durationSeconds: Number(event.target.value) })
            }
          >
            <option value={24}>24 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>60 seconds</option>
            <option value={90}>90 seconds</option>
            <option value={118}>118 seconds</option>
          </select>
        </label>
        <button disabled={submitting || !form.prospect.trim()} type="submit">
          {submitting ? "Generating narration…" : "Start production render"}
        </button>
        <p className={styles.formNote}>
          Starting a render may use paid narration and compute services. The video is not considered
          finished until status reaches ready and playback is verified.
        </p>
      </form>

      <div className={styles.monitor} aria-live="polite">
        <div className={styles.monitorHeading}>
          <div>
            <span>Production monitor</span>
            <h2>{job ? job.status.replaceAll("_", " ") : "Waiting for a request"}</h2>
          </div>
          <strong>{Math.round(progress)}%</strong>
        </div>
        <div className={styles.progressTrack}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className={styles.stage}>
          {job?.stage || "Narration, scene rendering, muxing, QA, and durable delivery appear here."}
        </p>
        {error ? <div className={styles.error}>{error}</div> : null}
        {job?.error ? <div className={styles.error}>{job.error}</div> : null}

        {ready ? (
          <div className={styles.result}>
            <video controls playsInline preload="metadata" src={job?.videoUrl} />
            <div className={styles.actions}>
              <a href={job?.downloadUrl}>Download MP4</a>
              <a href={job?.videoUrl} target="_blank" rel="noreferrer">
                Open video
              </a>
            </div>
            <dl>
              <div>
                <dt>Job</dt>
                <dd>{job?.jobId}</dd>
              </div>
              <div>
                <dt>Verification</dt>
                <dd>Ready; confirm picture and narration before delivery</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div>01</div>
            <p>Submit the request. AutoTube generates narration and sends the job off-device.</p>
            <div>02</div>
            <p>The renderer creates scene motion, mixes audio, and performs technical QA.</p>
            <div>03</div>
            <p>A signed MP4 link appears only after the worker reports ready.</p>
          </div>
        )}
      </div>
    </section>
  );
}
