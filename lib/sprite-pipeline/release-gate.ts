export const SCORE_WEIGHTS = {
  architecture: 1200,
  continuity: 1000,
  manifest: 1000,
  renderTruthfulness: 1200,
  duplication: 1000,
  characterCoverage: 900,
  fxCoverage: 900,
  visualQuality: 1000,
  operations: 900,
  engineReadiness: 900,
} as const;

export type ScoreCategory = keyof typeof SCORE_WEIGHTS;

export type CategoryEvidence = {
  category: ScoreCategory;
  earned: number;
  evidencePaths: string[];
  mandatoryTestsExecuted: boolean;
};

export type ReleaseGateInput = {
  categories: CategoryEvidence[];
  unresolvedSeverityNineOrTen: number;
  blockerFailures: number;
  overallPassRate: number;
  publicationFailureRate: number;
  ownershipComplete: boolean;
  transitionIntegrity: boolean;
  idempotencyIntegrity: boolean;
  archiveIntegrity: boolean;
  packageIntegrity: boolean;
  falseRenderClaims: number;
  duplicateIds: number;
  filenameCollisions: number;
  corruptValidatedFiles: number;
  continuityGaps: number;
  unauthorizedOverwrites: number;
  crashRecoveryPassed: boolean;
  realCharacterE2EPassed: boolean;
  realFxE2EPassed: boolean;
  sequenceSyncPassed: boolean;
  engineImportPassed: boolean;
  originalityReviewPassed: boolean;
};

export type ReleaseGateResult = {
  score: number;
  passed: boolean;
  failures: string[];
  categoryScores: Record<ScoreCategory, number>;
};

export function evaluateReleaseGate(input: ReleaseGateInput): ReleaseGateResult {
  const failures: string[] = [];
  const categoryScores = Object.fromEntries(Object.keys(SCORE_WEIGHTS).map((key) => [key, 0])) as Record<ScoreCategory, number>;
  const seen = new Set<ScoreCategory>();

  for (const evidence of input.categories) {
    if (seen.has(evidence.category)) failures.push(`Duplicate score category: ${evidence.category}`);
    seen.add(evidence.category);
    const max = SCORE_WEIGHTS[evidence.category];
    if (!Number.isInteger(evidence.earned) || evidence.earned < 0 || evidence.earned > max) {
      failures.push(`Invalid score for ${evidence.category}`);
      continue;
    }
    if (evidence.earned > 0 && (!evidence.mandatoryTestsExecuted || evidence.evidencePaths.length === 0)) {
      failures.push(`Missing executable evidence for ${evidence.category}`);
      continue;
    }
    categoryScores[evidence.category] = evidence.earned;
  }

  for (const category of Object.keys(SCORE_WEIGHTS) as ScoreCategory[]) {
    if (!seen.has(category)) failures.push(`Missing score category: ${category}`);
  }

  const exactZeroChecks: Array<[number, string]> = [
    [input.unresolvedSeverityNineOrTen, "Unresolved severity-9/10 defects"],
    [input.blockerFailures, "Blocker-test failures"],
    [input.falseRenderClaims, "False render claims"],
    [input.duplicateIds, "Duplicate IDs"],
    [input.filenameCollisions, "Filename collisions"],
    [input.corruptValidatedFiles, "Corrupt validated files"],
    [input.continuityGaps, "Unexplained continuity gaps"],
    [input.unauthorizedOverwrites, "Unauthorized overwrites"],
  ];
  for (const [count, label] of exactZeroChecks) if (count !== 0) failures.push(`${label}: ${count}`);

  const requiredFlags: Array<[boolean, string]> = [
    [input.ownershipComplete, "Ownership incomplete"],
    [input.transitionIntegrity, "Transition integrity failed"],
    [input.idempotencyIntegrity, "Idempotency integrity failed"],
    [input.archiveIntegrity, "Archive integrity failed"],
    [input.packageIntegrity, "Package integrity failed"],
    [input.crashRecoveryPassed, "Crash recovery failed"],
    [input.realCharacterE2EPassed, "Real character E2E failed"],
    [input.realFxE2EPassed, "Real FX E2E failed"],
    [input.sequenceSyncPassed, "Sequence synchronization failed"],
    [input.engineImportPassed, "Engine import failed"],
    [input.originalityReviewPassed, "Originality review failed"],
  ];
  for (const [passed, label] of requiredFlags) if (!passed) failures.push(label);

  if (input.overallPassRate < 0.99 || input.overallPassRate > 1) failures.push("Overall pass rate below 99%");
  if (input.publicationFailureRate < 0 || input.publicationFailureRate > 0.02) failures.push("Publication failure rate above 2%");

  const score = (Object.keys(categoryScores) as ScoreCategory[]).reduce((sum, key) => sum + categoryScores[key], 0);
  if (score !== 10_000) failures.push(`Evidence-backed score is ${score}, not 10000`);
  return { score, passed: failures.length === 0, failures, categoryScores };
}
