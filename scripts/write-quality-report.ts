import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type BenchmarkMetrics = Record<string, number | string | null>;

type AcquisitionMetrics = {
  reportName: string;
  generatedAt: string;
  canonicalDomain: string;
  sourceArtifacts: Record<string, string>;
  productSnapshot: Record<string, number>;
  diligenceStatus: Record<string, string>;
  weeklyBenchmarkMetrics: BenchmarkMetrics;
  goldenDatasetBuckets: Record<string, { status: string; description: string }>;
  stopRules: {
    outreachAllowed: boolean;
    reasons: string[];
  };
};

const args = new Map<string, string | boolean>();
for (const arg of process.argv.slice(2)) {
  if (arg === "--force") {
    args.set("force", true);
    continue;
  }

  const [key, value] = arg.split("=", 2);
  if (key.startsWith("--") && value) {
    args.set(key.slice(2), value);
  }
}

function todayInLosAngeles(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(new Date());
}

function statusLine(statuses: Record<string, string>): string {
  const red = Object.values(statuses).filter((status) => status === "missing").length;
  const yellow = Object.values(statuses).filter((status) => status === "in_progress").length;
  const ready = Object.values(statuses).filter((status) => status === "review_ready" || status === "clean").length;

  if (red > 0) {
    return `Red stopper gates remain: ${red} missing, ${yellow} in progress, ${ready} review-ready or clean.`;
  }

  if (yellow > 0) {
    return `Yellow: no missing gates, but ${yellow} areas are still in progress.`;
  }

  return "Green: all tracked diligence areas are review-ready or clean.";
}

function valueOrTbd(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "TBD";
  }

  return String(value);
}

const reportDate = String(args.get("date") ?? todayInLosAngeles());
const force = args.get("force") === true;
const root = process.cwd();
const metricsPath = join(root, "data", "acquisition_readiness_metrics.json");
const docsDir = join(root, "docs");
const outputPath = join(docsDir, `quality-report-${reportDate}.md`);

const metrics = JSON.parse(readFileSync(metricsPath, "utf8")) as AcquisitionMetrics;

if (existsSync(outputPath) && !force) {
  console.log(`Quality report already exists: ${outputPath}`);
  console.log("Use --force to overwrite it.");
  process.exit(0);
}

mkdirSync(docsDir, { recursive: true });

const productRows = Object.entries(metrics.productSnapshot)
  .map(([key, value]) => `| ${key} | ${value} |`)
  .join("\n");

const metricRows = [
  ["Task quality", "quality_score", "Must not drop more than 2 percent week over week."],
  ["False positives", "false_positive_rate", "High-impact false positives block release."],
  ["False negatives", "false_negative_rate", "Workflow-specific misses require review."],
  ["Confidence routing", "confidence_pass_rate", "Must match workflow risk band."],
  ["Drift", "drift_score", "Green below 0.20."],
  ["Latency", "p50_latency_ms", "Workflow-specific."],
  ["Latency", "p95_latency_ms", "Workflow-specific."],
  ["Reliability", "timeout_rate", "Below 1.5 percent."],
  ["Reliability", "rollback_rate", "Below 1.2 percent."],
  ["Cost", "cost_per_request_usd", "No increase above 10 percent without owner note."],
  ["Incidents", "incident_count", "0 critical customer-visible incidents."]
]
  .map(([metric, field, threshold]) => {
    return `| ${metric} | \`${field}\` | ${valueOrTbd(metrics.weeklyBenchmarkMetrics[field])} | ${threshold} |`;
  })
  .join("\n");

const bucketRows = Object.entries(metrics.goldenDatasetBuckets)
  .map(([bucket, details]) => `| \`${bucket}\` | ${details.description} | ${details.status} |`)
  .join("\n");

const statusRows = Object.entries(metrics.diligenceStatus)
  .map(([area, status]) => `| ${area} | ${status} |`)
  .join("\n");

const stopReasons = metrics.stopRules.reasons.map((reason) => `- ${reason}`).join("\n");

const report = `# ${metrics.canonicalDomain} AI Quality and Reliability Report

Report date: ${reportDate}
Reporting period: weekly benchmark baseline
Status: ${metrics.weeklyBenchmarkMetrics.status ?? "pending_first_real_run"}
Visibility: internal

## Executive Result

${statusLine(metrics.diligenceStatus)}

This report is not allowed to invent metrics. Any TBD field must be populated from production logs, eval runs, customer workflow outcomes, or manually reviewed benchmark sets before buyer outreach.

## Source Artifacts

| Artifact | Path |
|---|---|
${Object.entries(metrics.sourceArtifacts).map(([name, path]) => `| ${name} | \`${path}\` |`).join("\n")}

## Product Snapshot

| Metric | Value |
|---|---:|
${productRows}

## Required Benchmark Metrics

| Metric | Required field | Current value | Pass threshold |
|---|---|---:|---|
${metricRows}

## Golden Dataset Buckets

| Bucket | Purpose | Current status |
|---|---|---|
${bucketRows}

## Diligence Status

| Area | Status |
|---|---|
${statusRows}

## Fallback Policy

| Condition | Required behavior |
|---|---|
| Below confidence threshold | Route to fallback model, deterministic template, or human review. |
| Customer-visible uncertainty | Disclose uncertainty and avoid irreversible action. |
| Provider outage | Use cached deterministic mode and log incident. |
| High-impact financial, legal, medical, hiring, or security output | Require human review. |

## Release Gate

No model, prompt, workflow, or routing change ships without a golden dataset run, failure sample review, fallback check, and owner signoff.

## Stop Rules

Outreach allowed: ${metrics.stopRules.outreachAllowed ? "yes" : "no"}

${stopReasons}

## Incident Closure

Every incident requires owner, cause, customer impact, mitigation, regression test, and close date.
`;

writeFileSync(outputPath, report, "utf8");
console.log(`Wrote ${outputPath}`);
