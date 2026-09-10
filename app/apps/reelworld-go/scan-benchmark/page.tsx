"use client";

import { useMemo, useRef, useState } from "react";
import { analyzeFrame } from "../water-detection-upgrade";

type Expected = "water" | "non-water";
type Trial = {
  id: number;
  expected: Expected;
  detectedWater: boolean;
  pass: boolean;
  meanConfidence: number;
  maxConfidence: number;
  finalEma: number;
  latencyMs: number;
  frames: number;
  timestamp: string;
};

const TARGET_TOTAL = 10;
const TARGET_CORRECT = 9;

export default function WaterScanBenchmarkPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "granted" | "denied" | "unsupported" | "error">("idle");
  const [running, setRunning] = useState(false);
  const [liveConfidence, setLiveConfidence] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [note, setNote] = useState("Use varied real-water scenes and hard negatives. Record one scene per trial.");

  const waterTrials = trials.filter(t => t.expected === "water");
  const negativeTrials = trials.filter(t => t.expected === "non-water");
  const correct = trials.filter(t => t.pass).length;
  const falsePositives = negativeTrials.filter(t => t.detectedWater).length;
  const falseNegatives = waterTrials.filter(t => !t.detectedWater).length;
  const targetReady = waterTrials.length >= 5 && negativeTrials.length >= 5;
  const releasePass = targetReady && correct >= TARGET_CORRECT && falsePositives === 0;

  const summary = useMemo(() => ({
    benchmarkVersion: "water-scan-device-v1",
    detectorThreshold: 46,
    releaseTarget: ">=9/10 correct with zero hard-negative false positives; at least 5 water and 5 non-water trials",
    cameraState,
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
    testedAt: new Date().toISOString(),
    totals: {
      trials: trials.length,
      water: waterTrials.length,
      nonWater: negativeTrials.length,
      correct,
      falsePositives,
      falseNegatives,
      releasePass,
    },
    trials,
  }), [cameraState, trials, waterTrials.length, negativeTrials.length, correct, falsePositives, falseNegatives, releasePass]);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      setNote("This browser does not expose getUserMedia. Use a supported HTTPS mobile browser.");
      return;
    }
    try {
      streamRef.current?.getTracks().forEach(track => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("granted");
      setNote("Camera ready. Fill most of the view with one test scene, then record its expected class.");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setCameraState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      setNote(name === "NotAllowedError" ? "Camera permission denied. Allow camera access and retry." : "Camera could not start. Check HTTPS, browser camera support, and device permissions.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("idle");
  }

  async function recordTrial(expected: Expected) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (running || cameraState !== "granted" || !video?.videoWidth || !canvas) {
      setNote("Start the camera and wait for live video before recording a trial.");
      return;
    }
    setRunning(true);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      setRunning(false);
      setNote("Canvas analysis is unavailable in this browser.");
      return;
    }
    canvas.width = 40;
    canvas.height = 28;
    let previousLuma: Float32Array | undefined;
    let ema = 0;
    let stableFrames = 0;
    let locked = false;
    const confidences: number[] = [];
    const started = performance.now();
    let detectedAt: number | null = null;

    for (let frame = 0; frame < 10; frame++) {
      ctx.drawImage(video, 0, 0, 40, 28);
      const image = ctx.getImageData(0, 0, 40, 28);
      const analysis = analyzeFrame(image.data, 40, 28, previousLuma);
      previousLuma = analysis.luma;
      const rawScore = analysis.confidence * 100;
      confidences.push(rawScore);
      const alpha = rawScore > ema ? 0.34 : 0.2;
      ema += (rawScore - ema) * alpha;
      setLiveConfidence(Math.round(ema));
      stableFrames = ema >= 46 ? stableFrames + 1 : 0;
      if (!locked && stableFrames >= 3) {
        locked = true;
        detectedAt ??= performance.now();
      }
      if (frame < 9) await new Promise(resolve => window.setTimeout(resolve, 220));
    }

    const finished = performance.now();
    const meanConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const trial: Trial = {
      id: trials.length + 1,
      expected,
      detectedWater: locked,
      pass: expected === "water" ? locked : !locked,
      meanConfidence: Number(meanConfidence.toFixed(1)),
      maxConfidence: Number(Math.max(...confidences).toFixed(1)),
      finalEma: Number(ema.toFixed(1)),
      latencyMs: Math.round((detectedAt ?? finished) - started),
      frames: confidences.length,
      timestamp: new Date().toISOString(),
    };
    setTrials(current => [...current, { ...trial, id: current.length + 1 }]);
    setRunning(false);
    setNote(`${trial.pass ? "PASS" : "FAIL"}: expected ${expected}, detector ${locked ? "accepted water" : "rejected water"}. Move to a different scene before the next trial.`);
  }

  function exportEvidence() {
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reelworld-water-scan-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ minHeight: "100dvh", background: "#06111a", color: "#eefaff", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 6 }}>ReelWorld Water Scan — Device Benchmark</h1>
        <p style={{ opacity: .78, marginTop: 0 }}>Production acceptance harness. Target: at least 5 true-water + 5 hard-negative scenes, ≥9/10 correct, and zero hard-negative false positives.</p>

        <section style={{ border: "1px solid #315264", borderRadius: 14, padding: 12, marginBottom: 12 }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", background: "#000", borderRadius: 10 }} />
          <canvas ref={canvasRef} hidden />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button onClick={startCamera} disabled={running}>Start camera</button>
            <button onClick={stopCamera} disabled={running || cameraState === "idle"}>Stop camera</button>
            <button onClick={() => recordTrial("water")} disabled={running || cameraState !== "granted"}>{running ? "Sampling…" : "Record WATER"}</button>
            <button onClick={() => recordTrial("non-water")} disabled={running || cameraState !== "granted"}>{running ? "Sampling…" : "Record NON-WATER"}</button>
          </div>
          <p><strong>Camera:</strong> {cameraState} · <strong>Live EMA:</strong> {liveConfidence}%</p>
          <p style={{ marginBottom: 0 }}>{note}</p>
        </section>

        <section style={{ border: "1px solid #315264", borderRadius: 14, padding: 12, marginBottom: 12 }}>
          <h2 style={{ marginTop: 0 }}>Acceptance status</h2>
          <p><strong>{releasePass ? "GREEN" : "NOT GREEN"}</strong> · {correct}/{trials.length} correct · FP {falsePositives} · FN {falseNegatives} · Water {waterTrials.length}/5 · Non-water {negativeTrials.length}/5</p>
          <button onClick={exportEvidence} disabled={!trials.length}>Export JSON evidence</button>
          <button onClick={() => setTrials([])} disabled={running || !trials.length} style={{ marginLeft: 8 }}>Reset trials</button>
        </section>

        <section style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr><th>#</th><th>Expected</th><th>Detected</th><th>Result</th><th>Mean</th><th>EMA</th><th>Latency</th></tr></thead>
            <tbody>{trials.map(t => <tr key={t.id}><td>{t.id}</td><td>{t.expected}</td><td>{t.detectedWater ? "water" : "non-water"}</td><td>{t.pass ? "PASS" : "FAIL"}</td><td>{t.meanConfidence}%</td><td>{t.finalEma}%</td><td>{t.latencyMs} ms</td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
