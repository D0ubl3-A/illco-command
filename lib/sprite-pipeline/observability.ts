export type PipelineMetricSnapshot = {
  runId: string;
  capturedAt: string;
  queueDepth: number;
  throughputPerMinute: number;
  successRate: number;
  retryRate: number;
  failureRate: number;
  duplicateRate: number;
  chromaFailureRate: number;
  alphaFailureRate: number;
  clippingFailureRate: number;
  ipRiskRate: number;
  sequenceFailureRate: number;
  lockContentionRate: number;
  staleLocksRecovered: number;
  storageBytes: number;
  archiveHealthy: boolean;
  packageHealthy: boolean;
  publicationHealthy: boolean;
  score: number;
};

export type AlertThresholds = {
  maxFailureRate: number;
  maxRetryRate: number;
  maxDuplicateRate: number;
  maxLockContentionRate: number;
  maxQueueDepth: number;
  maxScoreRegression: number;
  maxStorageGrowthBytes: number;
};

export type PipelineAlert = {
  code: string;
  severity: 7 | 8 | 9 | 10;
  message: string;
  blocker: boolean;
};

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  maxFailureRate: 0.05,
  maxRetryRate: 0.1,
  maxDuplicateRate: 0.02,
  maxLockContentionRate: 0.1,
  maxQueueDepth: 50_000,
  maxScoreRegression: 0,
  maxStorageGrowthBytes: 50 * 1024 * 1024 * 1024,
};

function validRate(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function validateMetricSnapshot(snapshot: PipelineMetricSnapshot): string[] {
  const failures: string[] = [];
  if (!snapshot.runId.trim()) failures.push("runId is required");
  if (Number.isNaN(Date.parse(snapshot.capturedAt))) failures.push("capturedAt is invalid");
  for (const [name, value] of Object.entries({ successRate: snapshot.successRate, retryRate: snapshot.retryRate, failureRate: snapshot.failureRate, duplicateRate: snapshot.duplicateRate, chromaFailureRate: snapshot.chromaFailureRate, alphaFailureRate: snapshot.alphaFailureRate, clippingFailureRate: snapshot.clippingFailureRate, ipRiskRate: snapshot.ipRiskRate, sequenceFailureRate: snapshot.sequenceFailureRate, lockContentionRate: snapshot.lockContentionRate })) {
    if (!validRate(value)) failures.push(`${name} must be within 0..1`);
  }
  const terminalRate = snapshot.successRate + snapshot.failureRate;
  if (Math.abs(terminalRate - 1) > 0.000001) failures.push("successRate + failureRate must equal 1");
  for (const [name, value] of Object.entries({ queueDepth: snapshot.queueDepth, throughputPerMinute: snapshot.throughputPerMinute, staleLocksRecovered: snapshot.staleLocksRecovered, storageBytes: snapshot.storageBytes })) {
    if (!Number.isFinite(value) || value < 0) failures.push(`${name} cannot be negative`);
  }
  if (!Number.isInteger(snapshot.queueDepth)) failures.push("queueDepth must be an integer");
  if (!Number.isInteger(snapshot.staleLocksRecovered)) failures.push("staleLocksRecovered must be an integer");
  if (!Number.isInteger(snapshot.storageBytes)) failures.push("storageBytes must be an integer");
  if (!Number.isInteger(snapshot.score) || snapshot.score < 0 || snapshot.score > 10_000) failures.push("score must be an integer from 0 to 10000");
  return failures;
}

export function evaluatePipelineAlerts(current: PipelineMetricSnapshot, previous: PipelineMetricSnapshot | null, thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS): PipelineAlert[] {
  const alerts: PipelineAlert[] = [];
  const invalid = validateMetricSnapshot(current);
  if (invalid.length) return [{ code: "STATE-CORRUPTION", severity: 10, message: invalid.join("; "), blocker: true }];
  if (current.failureRate > thresholds.maxFailureRate) alerts.push({ code: "FAILURE-SPIKE", severity: 9, message: `Failure rate ${current.failureRate} exceeds ${thresholds.maxFailureRate}`, blocker: true });
  if (current.retryRate > thresholds.maxRetryRate) alerts.push({ code: "RETRY-SPIKE", severity: 8, message: `Retry rate ${current.retryRate} exceeds ${thresholds.maxRetryRate}`, blocker: false });
  if (current.duplicateRate > thresholds.maxDuplicateRate) alerts.push({ code: "DUPLICATE-SPIKE", severity: 9, message: `Duplicate rate ${current.duplicateRate} exceeds ${thresholds.maxDuplicateRate}`, blocker: true });
  if (current.lockContentionRate > thresholds.maxLockContentionRate) alerts.push({ code: "LOCK-CONTENTION", severity: 8, message: `Lock contention ${current.lockContentionRate} exceeds ${thresholds.maxLockContentionRate}`, blocker: false });
  if (current.queueDepth > thresholds.maxQueueDepth) alerts.push({ code: "QUEUE-BACKLOG", severity: 8, message: `Queue depth ${current.queueDepth} exceeds ${thresholds.maxQueueDepth}`, blocker: false });
  if (!current.archiveHealthy) alerts.push({ code: "ARCHIVE-UNHEALTHY", severity: 10, message: "Archive integrity health check failed", blocker: true });
  if (!current.packageHealthy) alerts.push({ code: "PACKAGE-UNHEALTHY", severity: 9, message: "Package integrity health check failed", blocker: true });
  if (!current.publicationHealthy) alerts.push({ code: "PUBLICATION-UNHEALTHY", severity: 9, message: "Publication health check failed", blocker: true });
  if (previous) {
    const scoreRegression = previous.score - current.score;
    if (scoreRegression > thresholds.maxScoreRegression) alerts.push({ code: "SCORE-REGRESSION", severity: 10, message: `Score regressed by ${scoreRegression}`, blocker: true });
    const storageGrowth = current.storageBytes - previous.storageBytes;
    if (storageGrowth > thresholds.maxStorageGrowthBytes) alerts.push({ code: "STORAGE-GROWTH", severity: 8, message: `Storage grew by ${storageGrowth} bytes`, blocker: false });
    if (Date.parse(current.capturedAt) <= Date.parse(previous.capturedAt)) alerts.push({ code: "METRIC-TIME-REGRESSION", severity: 10, message: "Metric timestamp did not advance", blocker: true });
  }
  return alerts;
}
