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

export const REQUIRED_ENGINE_PACKAGE_TARGETS = ["unity", "godot", "unreal", "generic"] as const;

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
  publicationFailureRate: number;
  mandatoryTestsExecuted: boolean;
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

function normalizedPackageTargets(targets: string[]): Set<string> {
  if (!Array.isArray(targets)) throw new TypeError("packageTargets must be an array");
  const normalized = targets.map((target) => {
    if (typeof target !== "string" || !target.trim()) throw new TypeError("packageTargets must contain non-empty strings");
    return target.trim().toLowerCase();
  });
  return new Set(normalized);
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
  if (!Number.isFinite(input.publicationFailureRate) || input.publicationFailureRate < 0 || input.publicationFailureRate > 1) throw new RangeError("publicationFailureRate must be between 0 and 1");
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
    "mandatoryTestsExecuted",
  ] as const) requireBoolean(input[key], key);

  const characterCoverage = boundedRatio(input.validatedCharacters, expectedCharacters);
  const fxCoverage = boundedRatio(input.validatedFx, expectedFx);
  const packageTargets = normalizedPackageTargets(input.packageTargets);
  const hasAllRequiredPackageTargets = REQUIRED_ENGINE_PACKAGE_TARGETS.every((target) => packageTargets.has(target));

  const categories: ProductionScoreResult["categories"] = {
    architectureOrchestration: input.crashRecoveryPassed && input.transitionCoveragePassed ? PRODUCTION_SCORE_WEIGHTS.architectureOrchestration : input.transitionCoveragePassed ? 700 : 450,
    continuityState: input.ownershipCoveragePassed && input.crashRecoveryPassed ? PRODUCTION_SCORE_WEIGHTS.continuityState : input.ownershipCoveragePassed ? 600 : 300,
    manifestIntegrity: input.packageVerificationPassed && input.exactHashesUnique ? PRODUCTION_SCORE_WEIGHTS.manifestIntegrity : input.exactHashesUnique ? 650 : 250,
    renderTruthfulness: input.validatedCharacters > 0 && input.validatedFx > 0 && input.packageVerificationPassed ? PRODUCTION_SCORE_WEIGHTS.renderTruthfulness : input.validatedCharacters + input.validatedFx > 0 ? 700 : 0,
    duplication: input.exactHashesUnique && input.perceptualDuplicateScanPassed ? PRODUCTION_SCORE_WEIGHTS.duplication : input.exactHashesUnique ? 350 : 0,
    characterCoverage: Math.floor(PRODUCTION_SCORE_WEIGHTS.characterCoverage * characterCoverage),
    fxTextureCoverage: Math.floor(PRODUCTION_SCORE_WEIGHTS.fxTextureCoverage * fxCoverage),
    visualQuality: input.validatedCharacters > 0 && input.validatedFx > 0 ? PRODUCTION_SCORE_WEIGHTS.visualQuality : 0,
    scalabilityOperations: input.crashRecoveryPassed ? PRODUCTION_SCORE_WEIGHTS.scalabilityOperations : 350,
    commercialEngineReadiness: input.packageVerificationPassed && hasAllRequiredPackageTargets ? PRODUCTION_SCORE_WEIGHTS.commercialEngineReadiness : input.packageVerificationPassed ? 500 : 0,
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
  if (input.publicationFailureRate > 0.02) blockers.push(`publication failure rate ${(input.publicationFailureRate * 100).toFixed(2)}% exceeds 2%`);
  if (!input.packageVerificationPassed || !hasAllRequiredPackageTargets) blockers.push("engine-package verification is incomplete");
  if (!input.mandatoryTestsExecuted) blockers.push("mandatory test suite has not been fully executed");
  if (input.mandatoryTestPassRate < 0.99) blockers.push(`mandatory test pass rate ${(input.mandatoryTestPassRate * 100).toFixed(2)}% is below 99%`);
  if (input.blockerTestFailures > 0) blockers.push(`${input.blockerTestFailures} blocker-test failures`);

  const rawScore = Object.values(categories).reduce((sum, value) => sum + value, 0);
  const gatePassed = blockers.length === 0 && rawScore === 10_000;
  const score = gatePassed ? 10_000 : Math.min(rawScore, 9_999);
  return { rawScore, score, capped: score !== rawScore, categories, blockers, gatePassed };
}
