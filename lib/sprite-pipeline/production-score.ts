export const PRODUCTION_SCORE_WEIGHTS = {
  architectureOrchestration: 1200,
  continuityState: 1000,
  manifestIntegrity: 1000,
  renderTruthfulness: 1200,
  duplication: 1000,
  characterCoverage: 900,
  fxTextureCoverage: 900,
  visualQuality: 1000,
  scalabilityOperations: 900,
  commercialEngineReadiness: 900,
} as const;

export type ProductionScoreInput = {
  validatedCharacters: number;
  validatedFx: number;
  expectedCharacters?: number;
  expectedFx?: number;
  packageTargets: string[];
  packageVerificationPassed: boolean;
  exactHashesUnique: boolean;
  perceptualDuplicateScanPassed: boolean;
  ownershipCoveragePassed: boolean;
  transitionCoveragePassed: boolean;
  crashRecoveryPassed: boolean;
  sequenceSynchronizationPassed: boolean;
  originalityReviewPassed: boolean;
  publicationGatePassed: boolean;
  unresolvedSeverityNineOrTen: number;
  mandatoryTestPassRate: number;
  blockerTestFailures: number;
};

export type ProductionScoreResult = {
  rawScore: number;
  score: number;
  capped: boolean;
  categories: Record<keyof typeof PRODUCTION_SCORE_WEIGHTS, number>;
  blockers: string[];
  gatePassed: boolean;
};

function boundedRatio(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || value < 0 || total <= 0) return 0;
  return Math.max(0, Math.min(1, value / total));
}

function requireBoolean(value: unknown, name: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`);
}

export function calculateProductionScore(input: ProductionScoreInput): ProductionScoreResult {
  const expectedCharacters = input.expectedCharacters ?? 10_000;
  const expectedFx = input.expectedFx ?? 10_000;
  if (!Number.isSafeInteger(input.validatedCharacters) || input.validatedCharacters < 0) throw new RangeError("validatedCharacters must be a non-negative safe integer");
  if (!Number.isSafeInteger(input.validatedFx) || input.validatedFx < 0) throw new RangeError("validatedFx must be a non-negative safe integer");
  if (!Number.isSafeInteger(expectedCharacters) || expectedCharacters < 1) throw new RangeError("expectedCharacters must be a positive safe integer");
  if (!Number.isSafeInteger(expectedFx) || expectedFx < 1) throw new RangeError("expectedFx must be a positive safe integer");
  if (!Number.isSafeInteger(input.unresolvedSeverityNineOrTen) || input.unresolvedSeverityNineOrTen < 0) throw new RangeError("unresolvedSeverityNineOrTen must be a non-negative safe integer");
  if (!Number.isSafeInteger(input.blockerTestFailures) || input.blockerTestFailures < 0) throw new RangeError("blockerTestFailures must be a non-negative safe integer");
  if (!Number.isFinite(input.mandatoryTestPassRate) || input.mandatoryTestPassRate < 0 || input.mandatoryTestPassRate > 1) throw new RangeError("mandatoryTestPassRate must be between 0 and 1");
  for (const key of [
    "packageVerificationPassed",
    "exactHashesUnique",
    "perceptualDuplicateScanPassed",
    "ownershipCoveragePassed",
    "transitionCoveragePassed",
    "crashRecoveryPassed",
    "sequenceSynchronizationPassed",
    "originalityReviewPassed",
    "publicationGatePassed",
  ] as const) requireBoolean(input[key], key);

  const characterCoverage = boundedRatio(input.validatedCharacters, expectedCharacters);
  const fxCoverage = boundedRatio(input.validatedFx, expectedFx);
  const hasAllFourPackageTargets = new Set(input.packageTargets).size >= 4;

  const categories: ProductionScoreResult["categories"] = {
    architectureOrchestration: input.crashRecoveryPassed && input.transitionCoveragePassed ? 1200 : input.transitionCoveragePassed ? 700 : 450,
    continuityState: input.ownershipCoveragePassed && input.crashRecoveryPassed ? 1000 : input.ownershipCoveragePassed ? 600 : 300,
    manifestIntegrity: input.packageVerificationPassed && input.exactHashesUnique ? 1000 : input.exactHashesUnique ? 650 : 250,
    renderTruthfulness: input.validatedCharacters > 0 && input.validatedFx > 0 && input.packageVerificationPassed ? 1050 : input.validatedCharacters + input.validatedFx > 0 ? 700 : 0,
    duplication: input.exactHashesUnique && input.perceptualDuplicateScanPassed ? 1000 : input.exactHashesUnique ? 350 : 0,
    characterCoverage: Math.floor(PRODUCTION_SCORE_WEIGHTS.characterCoverage * characterCoverage),
    fxTextureCoverage: Math.floor(PRODUCTION_SCORE_WEIGHTS.fxTextureCoverage * fxCoverage),
    visualQuality: input.validatedCharacters > 0 && input.validatedFx > 0 ? 500 : 0,
    scalabilityOperations: input.crashRecoveryPassed ? 800 : 350,
    commercialEngineReadiness: input.packageVerificationPassed && hasAllFourPackageTargets ? 800 : input.packageVerificationPassed ? 500 : 0,
  };

  const blockers: string[] = [];
  if (input.unresolvedSeverityNineOrTen > 0) blockers.push(`${input.unresolvedSeverityNineOrTen} unresolved severity-9/10 defects`);
  if (!input.ownershipCoveragePassed) blockers.push("ownership coverage is incomplete");
  if (!input.transitionCoveragePassed) blockers.push("status-transition coverage is incomplete");
  if (!input.crashRecoveryPassed) blockers.push("crash-recovery gate has not passed");
  if (!input.perceptualDuplicateScanPassed) blockers.push("perceptual duplicate stack has not passed");
  if (characterCoverage < 1) blockers.push(`character coverage ${(characterCoverage * 100).toFixed(2)}%`);
  if (fxCoverage < 1) blockers.push(`FX/texture coverage ${(fxCoverage * 100).toFixed(2)}%`);
  if (!input.sequenceSynchronizationPassed) blockers.push("sequence synchronization has not passed");
  if (!input.originalityReviewPassed) blockers.push("originality/IP review has not passed");
  if (!input.publicationGatePassed) blockers.push("publication gate has not passed");
  if (!input.packageVerificationPassed || !hasAllFourPackageTargets) blockers.push("engine-package verification is incomplete");
  if (input.mandatoryTestPassRate < 0.99) blockers.push(`mandatory test pass rate ${(input.mandatoryTestPassRate * 100).toFixed(2)}% is below 99%`);
  if (input.blockerTestFailures > 0) blockers.push(`${input.blockerTestFailures} blocker-test failures`);

  const rawScore = Object.values(categories).reduce((sum, value) => sum + value, 0);
  const gatePassed = blockers.length === 0 && rawScore === 10_000;
  const score = gatePassed ? 10_000 : Math.min(rawScore, 9_999);
  return { rawScore, score, capped: score !== rawScore, categories, blockers, gatePassed };
}
