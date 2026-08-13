import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePipelineAlerts, validateMetricSnapshot, type PipelineMetricSnapshot } from "../lib/sprite-pipeline/observability";

function snapshot(overrides: Partial<PipelineMetricSnapshot> = {}): PipelineMetricSnapshot {
  return {
    runId: "run-001",
    capturedAt: "2026-07-30T15:00:00.000Z",
    queueDepth: 100,
    throughputPerMinute: 20,
    successRate: 0.99,
    retryRate: 0.01,
    failureRate: 0.01,
    duplicateRate: 0.005,
    chromaFailureRate: 0.005,
    alphaFailureRate: 0.002,
    clippingFailureRate: 0.001,
    ipRiskRate: 0,
    sequenceFailureRate: 0.002,
    lockContentionRate: 0.01,
    staleLocksRecovered: 1,
    storageBytes: 1_000_000,
    archiveHealthy: true,
    packageHealthy: true,
    publicationHealthy: true,
    score: 4200,
    ...overrides,
  };
}

test("accepts a coherent metric snapshot", () => {
  assert.deepEqual(validateMetricSnapshot(snapshot()), []);
});

test("rejects inconsistent terminal rates", () => {
  const failures = validateMetricSnapshot(snapshot({ successRate: 0.9, failureRate: 0.05 }));
  assert.match(failures.join("\n"), /must equal 1/);
});

test("raises blocker alerts for integrity and score regression", () => {
  const previous = snapshot({ capturedAt: "2026-07-30T14:00:00.000Z", score: 4300, storageBytes: 900_000 });
  const alerts = evaluatePipelineAlerts(snapshot({ archiveHealthy: false, score: 4200 }), previous);
  assert.equal(alerts.some((alert) => alert.code === "ARCHIVE-UNHEALTHY" && alert.blocker), true);
  assert.equal(alerts.some((alert) => alert.code === "SCORE-REGRESSION" && alert.severity === 10 && alert.blocker), true);
});

test("raises duplicate and failure spike blockers", () => {
  const alerts = evaluatePipelineAlerts(snapshot({ successRate: 0.9, failureRate: 0.1, duplicateRate: 0.05 }), null);
  assert.equal(alerts.some((alert) => alert.code === "FAILURE-SPIKE" && alert.blocker), true);
  assert.equal(alerts.some((alert) => alert.code === "DUPLICATE-SPIKE" && alert.blocker), true);
});

test("raises blockers for visual, sequence, and IP risk spikes", () => {
  const alerts = evaluatePipelineAlerts(snapshot({
    chromaFailureRate: 0.03,
    alphaFailureRate: 0.03,
    clippingFailureRate: 0.02,
    ipRiskRate: 0.01,
    sequenceFailureRate: 0.02,
  }), null);
  for (const code of ["CHROMA-FAILURE-SPIKE", "ALPHA-FAILURE-SPIKE", "CLIPPING-FAILURE-SPIKE", "IP-RISK-SPIKE", "SEQUENCE-FAILURE-SPIKE"]) {
    assert.equal(alerts.some((alert) => alert.code === code && alert.blocker), true, `${code} must block release`);
  }
  assert.equal(alerts.find((alert) => alert.code === "IP-RISK-SPIKE")?.severity, 10);
});

test("treats malformed metrics as state corruption", () => {
  const alerts = evaluatePipelineAlerts(snapshot({ score: 10_001 }), null);
  assert.deepEqual(alerts.map((alert) => alert.code), ["STATE-CORRUPTION"]);
  assert.equal(alerts[0].severity, 10);
});
