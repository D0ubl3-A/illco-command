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
  commercialReadiness: 900,
} as const;

export type ScoreCategory = keyof typeof SCORE_WEIGHTS;

export type ControlEvidence = {
  controlId: string;
  category: ScoreCategory;
  points: number;
  implemented: boolean;
  passed: boolean;
  current: boolean;
  executable: boolean;
  evidencePath: string;
  evidenceSha256: string;
};

export type ReleaseFacts = {
  unresolvedSeverity9Or10: number;
  ownershipIntegrity: boolean;
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
  mandatoryTestsExecuted: boolean;
  testPassRate: number;
  blockerFailures: number;
  publicationFailureRate: number;
  evidenceComplete: boolean;
  crashRecoveryPassed: boolean;
  realCharacterE2ePassed: boolean;
  realFxE2ePassed: boolean;
  sequenceSyncPassed: boolean;
  enginePackageValidationPassed: boolean;
  originalityReviewPassed: boolean;
};

export type ScoreResult = {
  categoryScores: Record<ScoreCategory, number>;
  rawScore: number;
  cappedScore: number;
  gatePassed: boolean;
  failedGates: string[];
  rejectedEvidence: string[];
};

const SHA256 = /^[a-f0-9]{64}$/i;

function releaseFailures(facts: ReleaseFacts): string[] {
  const failures: string[] = [];
  if (facts.unresolvedSeverity9Or10 !== 0) failures.push("unresolved severity-9/10 defects");
  for (const [label, passed] of Object.entries({ ownershipIntegrity: facts.ownershipIntegrity, transitionIntegrity: facts.transitionIntegrity, idempotencyIntegrity: facts.idempotencyIntegrity, archiveIntegrity: facts.archiveIntegrity, packageIntegrity: facts.packageIntegrity, mandatoryTestsExecuted: facts.mandatoryTestsExecuted, evidenceComplete: facts.evidenceComplete, crashRecoveryPassed: facts.crashRecoveryPassed, realCharacterE2ePassed: facts.realCharacterE2ePassed, realFxE2ePassed: facts.realFxE2ePassed, sequenceSyncPassed: facts.sequenceSyncPassed, enginePackageValidationPassed: facts.enginePackageValidationPassed, originalityReviewPassed: facts.originalityReviewPassed })) if (!passed) failures.push(label);
  for (const [label, count] of Object.entries({ falseRenderClaims: facts.falseRenderClaims, duplicateIds: facts.duplicateIds, filenameCollisions: facts.filenameCollisions, corruptValidatedFiles: facts.corruptValidatedFiles, continuityGaps: facts.continuityGaps, unauthorizedOverwrites: facts.unauthorizedOverwrites, blockerFailures: facts.blockerFailures })) if (count !== 0) failures.push(label);
  if (facts.testPassRate < 0.99) failures.push("test pass rate below 99%");
  if (facts.publicationFailureRate > 0.02) failures.push("publication failure rate above 2%");
  return failures;
}

export function calculateEvidenceScore(evidence: ControlEvidence[], facts: ReleaseFacts): ScoreResult {
  const categoryScores = Object.fromEntries(Object.keys(SCORE_WEIGHTS).map((key) => [key, 0])) as Record<ScoreCategory, number>;
  const rejectedEvidence: string[] = [];
  const seen = new Set<string>();
  for (const item of evidence) {
    if (seen.has(item.controlId)) {
      rejectedEvidence.push(`${item.controlId}: duplicate control evidence`);
      continue;
    }
    seen.add(item.controlId);
    const valid = item.implemented && item.passed && item.current && item.executable && item.evidencePath.trim() && SHA256.test(item.evidenceSha256) && Number.isInteger(item.points) && item.points >= 0;
    if (!valid) {
      rejectedEvidence.push(`${item.controlId}: evidence is not creditable`);
      continue;
    }
    const remaining = SCORE_WEIGHTS[item.category] - categoryScores[item.category];
    categoryScores[item.category] += Math.min(item.points, Math.max(0, remaining));
  }
  const rawScore = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  const failedGates = releaseFailures(facts);
  const gatePassed = failedGates.length === 0 && rawScore === 10_000;
  const cappedScore = gatePassed ? 10_000 : Math.min(rawScore, 9_999);
  return { categoryScores, rawScore, cappedScore, gatePassed, failedGates, rejectedEvidence };
}
