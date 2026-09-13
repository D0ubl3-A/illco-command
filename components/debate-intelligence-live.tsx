"use client";

import { useRef, useState } from "react";
import type { FactCheck } from "@/lib/debate-fact-check";
import styles from "./debate-intelligence-live.module.css";

type SpeechRecognitionLike = { continuous: boolean; interimResults: boolean; lang: string; start(): void; stop(): void; onresult: ((event: any) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export function DebateIntelligenceLive() {
  const [transcript, setTranscript] = useState("");
  const [checks, setChecks] = useState<FactCheck[]>([]);
  const [listening, setListening] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  function toggleListening() {
    if (listening) { recognition.current?.stop(); setListening(false); return; }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setError("Live microphone transcription needs Chrome or Edge. You can still type or paste below."); return; }
    const instance: SpeechRecognitionLike = new Recognition();
    instance.continuous = true; instance.interimResults = true; instance.lang = "en-US";
    instance.onresult = (event: any) => {
      let finalText = ""; let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) (event.results[i].isFinal ? finalText : interim) += event.results[i][0].transcript;
      if (finalText) setTranscript((current) => `${current}${current ? " " : ""}${finalText.trim()}`);
      if (interim) setError(`Hearing: ${interim.trim()}`); else setError("");
    };
    instance.onerror = () => { setListening(false); setError("Microphone capture stopped. Check browser microphone permission."); };
    instance.onend = () => setListening(false);
    recognition.current = instance; instance.start(); setListening(true); setError("");
  }

  async function checkClaim() {
    if (transcript.trim().length < 8) { setError("Add a complete factual claim first."); return; }
    setChecking(true); setError("");
    try {
      const response = await fetch("/api/debate-intelligence/fact-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claim: transcript }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Fact-check failed.");
      setChecks((current) => [result, ...current].slice(0, 20));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Fact-check failed."); }
    finally { setChecking(false); }
  }

  return <main className={styles.page} id="main-content">
    <header className={styles.header}><div><span className={styles.liveDot} /> LIVE DEBATE INTELLIGENCE</div><strong>iLLCo AI</strong></header>
    <section className={styles.workspace}>
      <div className={styles.titleRow}><div><p>REAL-TIME TRANSCRIPT + FACT CHECKER</p><h1>Every claim. One live box.</h1></div><button className={listening ? styles.stop : styles.listen} onClick={toggleListening}>{listening ? "Stop listening" : "Start microphone"}</button></div>
      <div className={styles.transcriptBox} aria-live="polite">
        <label htmlFor="live-transcript">LIVE TRANSCRIPT</label>
        <textarea id="live-transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Start the microphone, or type/paste the speaker's claim here…" />
        <div className={styles.actions}><span>{transcript.length} characters</span><button onClick={checkClaim} disabled={checking}>{checking ? "Checking sources…" : "Fact-check this transcript"}</button></div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.results}>
          {checks.map((check, index) => <article key={`${check.claim}-${index}`} className={styles[check.verdict]}>
            <div className={styles.verdict}><strong>{check.verdict === "true" ? "TRUE" : check.verdict === "false" ? "FALSE" : "UNVERIFIED"}</strong><span>{check.confidence}% confidence</span></div>
            <p className={styles.claim}>“{check.claim}”</p><p>{check.explanation}</p>
            {check.sources.length > 0 && <div className={styles.sources}>{check.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div>}
          </article>)}
          {!checks.length && <p className={styles.empty}>Verified claims appear directly inside this transcript panel. TRUE turns green. FALSE turns red.</p>}
        </div>
      </div>
      <p className={styles.notice}>AI can make mistakes. Open the linked sources before treating a verdict as final.</p>
    </section>
  </main>;
}

