import { SCORE_CATEGORIES, SCORE_WEIGHTS, type ScoreCategory } from "./score-weights";

export type DefectStatus = "open" | "repairing" | "blocked" | "closed" | "accepted_exception";

export type DefectRecord = {
  issueId: string;
  surgeonVoters: number[];
  dissent: string[];
  subsystem: string;
  description: string;
  evidence: string[];
  severity: number;
  probability: number;
  impact: number;
  detectability: number;
  blocker: boolean;
  scoreLoss: number;
  rootCause: string;
  repair: string;
  owner: number;
  dependencies: string[];
  status: DefectStatus;
  validationPlan: string;
  regressionRisk: number;
  openedAt: string;
  updatedAt: string;
};

export type RankedDefect = DefectRecord & { priority: number; voteCount: number };

function assertRange(label: string, value: number, min: number, max: number): void {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
}

export function validateDefect(defect: DefectRecord): void {
  if (!defect.issueId.trim()) throw new Error("issueId is required");
  if (!defect.subsystem.trim() || !defect.description.trim()) throw new Error("subsystem and description are required");
  assertRange("severity", defect.severity, 1, 10);
  assertRange("probability", defect.probability, 1, 10);
  assertRange("impact", defect.impact, 1, 10);
  assertRange("detectability", defect.detectability, 1, 10);
  assertRange("regressionRisk", defect.regressionRisk, 1, 10);
  assertRange("owner", defect.owner, 1, 1000);
  if (!Number.isInteger(defect.scoreLoss) || defect.scoreLoss < 0 || defect.scoreLoss > 10_000) throw new Error("scoreLoss must be 0..10000");
  if (new Set(defect.surgeonVoters).size !== defect.surgeonVoters.length) throw new Error("surgeon votes must be unique");
  for (const surgeon of defect.surgeonVoters) assertRange("surgeon voter", surgeon, 1, 1000);
  if ((defect.status === "closed" || defect.status === "accepted_exception") && defect.evidence.length === 0) throw new Error("resolved defects require evidence");
  if (Number.isNaN(Date.parse(defect.openedAt)) || Number.isNaN(Date.parse(defect.updatedAt))) throw new Error("defect timestamps are invalid");
}

export function rankDefects(defects: DefectRecord[]): RankedDefect[] {
  const ids = new Set<string>();
  const ranked = defects.map((defect) => {
    validateDefect(defect);
    if (ids.has(defect.issueId)) throw new Error(`duplicate issueId ${defect.issueId}`);
    ids.add(defect.issueId);
    const blockerWeight = defect.blocker ? 1_000_000_000 : 0;
    const riskWeight = defect.severity * defect.probability * defect.impact * 10_000;
    const falseClaimWeight = defect.subsystem === "render_truthfulness" || defect.subsystem === "state_integrity" ? 100_000 : 0;
    const dependencyPenalty = defect.dependencies.length * 100;
    const priority = blockerWeight + riskWeight + falseClaimWeight + defect.scoreLoss * 10 + defect.regressionRisk * 100 - dependencyPenalty;
    return { ...defect, priority, voteCount: defect.surgeonVoters.length };
  });
  return ranked.sort((a, b) => b.priority - a.priority || b.voteCount - a.voteCount || a.issueId.localeCompare(b.issueId));
}

export { SCORE_WEIGHTS as SCORE_MAX, type ScoreCategory } from "./score-weights";

export function evidenceBackedScore(requested: Partial<Record<ScoreCategory, number>>, evidenceCounts: Partial<Record<ScoreCategory, number>>, unresolved: DefectRecord[]): { total: number; categories: Record<ScoreCategory, number>; gatePassed: boolean } {
  const categories = {} as Record<ScoreCategory, number>;
  for (const category of SCORE_CATEGORIES) {
    const value = requested[category] ?? 0;
    const evidence = evidenceCounts[category] ?? 0;
    categories[category] = evidence > 0 ? Math.max(0, Math.min(SCORE_WEIGHTS[category], Math.floor(value))) : 0;
  }
  const blockers = unresolved.filter((d) => d.status !== "closed" && d.status !== "accepted_exception" && (d.blocker || d.severity >= 9));
  let total = Object.values(categories).reduce((sum, value) => sum + value, 0);
  if (blockers.length > 0) total = Math.min(total, 9999);
  return { total, categories, gatePassed: total === 10_000 && blockers.length === 0 };
}
