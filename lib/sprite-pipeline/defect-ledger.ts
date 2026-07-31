export type DefectStatus = "open" | "in_progress" | "blocked" | "repaired" | "verified" | "rejected";

export type Defect = {
  issueId: string;
  surgeonVoters: number[];
  dissentingSurgeons: number[];
  subsystem: string;
  description: string;
  evidenceIds: string[];
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

export type RankedDefect = Defect & {
  voteCount: number;
  dissentCount: number;
  priorityScore: number;
};

function assertRange(value: number, label: string, min: number, max: number): void {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} must be an integer from ${min} through ${max}`);
}

function uniqueSortedSurgeons(values: number[], label: string): number[] {
  for (const value of values) assertRange(value, label, 1, 1000);
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicate surgeons`);
  return [...values].sort((a, b) => a - b);
}

export function validateDefect(input: Defect): Defect {
  if (!/^SPR-DEF-\d{6}$/.test(input.issueId)) throw new Error("issueId must use SPR-DEF-000000 format");
  if (!input.subsystem.trim()) throw new Error("subsystem is required");
  if (!input.description.trim()) throw new Error("description is required");
  if (!input.rootCause.trim()) throw new Error("rootCause is required");
  if (!input.repair.trim()) throw new Error("repair is required");
  if (!input.validationPlan.trim()) throw new Error("validationPlan is required");
  if (input.evidenceIds.length === 0 || input.evidenceIds.some((id) => !id.trim())) throw new Error("at least one evidence ID is required");
  if (new Set(input.evidenceIds).size !== input.evidenceIds.length) throw new Error("evidenceIds contains duplicates");
  assertRange(input.severity, "severity", 1, 10);
  assertRange(input.probability, "probability", 1, 10);
  assertRange(input.impact, "impact", 1, 10);
  assertRange(input.detectability, "detectability", 1, 10);
  assertRange(input.regressionRisk, "regressionRisk", 1, 10);
  assertRange(input.owner, "owner", 1, 1000);
  if (!Number.isInteger(input.scoreLoss) || input.scoreLoss < 0 || input.scoreLoss > 10000) throw new Error("scoreLoss must be an integer from 0 through 10000");
  if (Number.isNaN(Date.parse(input.openedAt)) || Number.isNaN(Date.parse(input.updatedAt))) throw new Error("defect timestamps must be valid");
  if (Date.parse(input.updatedAt) < Date.parse(input.openedAt)) throw new Error("updatedAt cannot precede openedAt");
  const surgeonVoters = uniqueSortedSurgeons(input.surgeonVoters, "surgeonVoters");
  const dissentingSurgeons = uniqueSortedSurgeons(input.dissentingSurgeons, "dissentingSurgeons");
  const overlap = dissentingSurgeons.filter((id) => surgeonVoters.includes(id));
  if (overlap.length) throw new Error(`surgeons cannot both vote and dissent: ${overlap.join(",")}`);
  if (new Set(input.dependencies).size !== input.dependencies.length) throw new Error("dependencies contains duplicates");
  if (input.dependencies.includes(input.issueId)) throw new Error("defect cannot depend on itself");
  return { ...input, surgeonVoters, dissentingSurgeons };
}

export function calculatePriority(defect: Defect): number {
  const blockerWeight = defect.blocker ? 1_000_000_000 : 0;
  const severeWeight = defect.severity >= 9 ? 100_000_000 : 0;
  const expectedLoss = defect.scoreLoss * defect.severity * defect.probability * defect.impact;
  const harmWeight = defect.severity * defect.impact * defect.probability * 1000;
  const detectionWeight = (11 - defect.detectability) * 100;
  const dependencyPenalty = defect.dependencies.length * 10;
  const dissentPenalty = defect.dissentingSurgeons.length;
  return blockerWeight + severeWeight + expectedLoss + harmWeight + detectionWeight - dependencyPenalty - dissentPenalty;
}

export function rankDefects(defects: Defect[]): RankedDefect[] {
  const ids = new Set<string>();
  const validated = defects.map(validateDefect);
  for (const defect of validated) {
    if (ids.has(defect.issueId)) throw new Error(`duplicate defect ID: ${defect.issueId}`);
    ids.add(defect.issueId);
  }
  for (const defect of validated) {
    for (const dependency of defect.dependencies) if (!ids.has(dependency)) throw new Error(`${defect.issueId} references unknown dependency ${dependency}`);
  }
  return validated
    .filter((defect) => !["verified", "rejected"].includes(defect.status))
    .map((defect) => ({ ...defect, voteCount: defect.surgeonVoters.length, dissentCount: defect.dissentingSurgeons.length, priorityScore: calculatePriority(defect) }))
    .sort((a, b) => b.priorityScore - a.priorityScore || b.voteCount - a.voteCount || a.issueId.localeCompare(b.issueId));
}

export function assertNoUnresolvedCriticalDefects(defects: Defect[]): void {
  const critical = defects.map(validateDefect).filter((defect) => defect.severity >= 9 && !["verified", "rejected"].includes(defect.status));
  if (critical.length) throw new Error(`unresolved severity-9/10 defects: ${critical.map((defect) => defect.issueId).sort().join(",")}`);
}
