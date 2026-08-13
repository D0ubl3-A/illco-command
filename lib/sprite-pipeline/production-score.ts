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
export const REQUIRED_CHARACTER_COUNT = 10_000;
export const REQUIRED_FX_COUNT = 10_000;
export const MAX_PRODUCTION_SCORE = Object.values(PRODUCTION_SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0);

type Category = keyof typeof PRODUCTION_SCORE_WEIGHTS;
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
  renderTruthfulnessPassed?: boolean;
  visualQualityPassed?: boolean;
};
export type ProductionScoreResult = {
  rawScore: number;
  score: number;
  capped: boolean;
  categories: Record<Category, number>;
  blockers: string[];
  gatePassed: boolean;
};

function count(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
  return value;
}

function boundedCount(value: number, maximum: number, name: string): number {
  const normalized = count(value, name);
  if (normalized > maximum) {
    throw new RangeError(`${name} cannot exceed the authoritative production target ${maximum}`);
  }
  return normalized;
}

function rate(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be between 0 and 1`);
  }
  return value;
}

function bool(value: unknown, name: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`);
}

function authoritativeTarget(value: number | undefined, required: number, name: string): number {
  if (value === undefined) return required;
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
  if (value !== required) {
    throw new RangeError(`${name} must equal the authoritative production target ${required}`);
  }
  return value;
}

function ratio(value: number, total: number): number {
  return value / total;
}

function targets(values: string[]): Set<string> {
  if (!Array.isArray(values)) throw new TypeError("packageTargets must be an array");
  const normalized = values.map((value) => {
    if (typeof value !== "string" || !value.trim()) {
      throw new TypeError("packageTargets must contain non-empty strings");
    }
    return value.trim().toLowerCase();
  });
  if (new Set(normalized).size !== normalized.length) {
    throw new RangeError("packageTargets must not contain duplicates");
  }
  const allowed = new Set<string>(REQUIRED_ENGINE_PACKAGE_TARGETS);
  const unknown = normalized.filter((value) => !allowed.has(value));
  if (unknown.length > 0) {
    throw new RangeError(`packageTargets contains unsupported targets: ${unknown.join(", ")}`);
  }
  return new Set(normalized);
}

export function calculateProductionScore(input: ProductionScoreInput): ProductionScoreResult {
  if (MAX_PRODUCTION_SCORE !== 10_000) {
    throw new Error(`authoritative production score weights must total 10000, received ${MAX_PRODUCTION_SCORE}`);
  }

  const expectedCharacters = authoritativeTarget(input.expectedCharacters, REQUIRED_CHARACTER_COUNT, "expectedCharacters");
  const expectedFx = authoritativeTarget(input.expectedFx, REQUIRED_FX_COUNT, "expectedFx");
  const validatedCharacters = boundedCount(input.validatedCharacters, expectedCharacters, "validatedCharacters");
  const validatedFx = boundedCount(input.validatedFx, expectedFx, "validatedFx");
  count(input.unresolvedSeverityNineOrTen, "unresolvedSeverityNineOrTen");
  count(input.blockerTestFailures, "blockerTestFailures");
  rate(input.mandatoryTestPassRate, "mandatoryTestPassRate");
  rate(input.publicationFailureRate, "publicationFailureRate");

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
  ] as const) {
    bool(input[key], key);
  }
  if (input.renderTruthfulnessPassed !== undefined) bool(input.renderTruthfulnessPassed, "renderTruthfulnessPassed");
  if (input.visualQualityPassed !== undefined) bool(input.visualQualityPassed, "visualQualityPassed");

  const weights = PRODUCTION_SCORE_WEIGHTS;
  const renderTruth = input.renderTruthfulnessPassed === true;
  const visualQuality = input.visualQualityPassed === true;
  const characterCoverage = ratio(validatedCharacters, expectedCharacters);
  const fxCoverage = ratio(validatedFx, expectedFx);
  const packageTargets = targets(input.packageTargets);
  const allTargets = REQUIRED_ENGINE_PACKAGE_TARGETS.every((target) => packageTargets.has(target));

  // Fail closed for compound categories. A category receives credit only when
  // every control represented by that category has current executable evidence.
  // Partial booleans are blockers, not a basis for arbitrary fractional points.
  const categories: Record<Category, number> = {
    architectureOrchestration:
      input.crashRecoveryPassed && input.transitionCoveragePassed
        ? weights.architectureOrchestration
        : 0,
    continuityState:
      input.ownershipCoveragePassed && input.crashRecoveryPassed
        ? weights.continuityState
        : 0,
    manifestIntegrity:
      input.packageVerificationPassed && input.exactHashesUnique
        ? weights.manifestIntegrity
        : 0,
    renderTruthfulness: renderTruth ? weights.renderTruthfulness : 0,
    duplication:
      input.exactHashesUnique && input.perceptualDuplicateScanPassed
        ? weights.duplication
        : 0,
    characterCoverage: Math.floor(weights.characterCoverage * characterCoverage),
    fxTextureCoverage: Math.floor(weights.fxTextureCoverage * fxCoverage),
    visualQuality: visualQuality ? weights.visualQuality : 0,
    scalabilityOperations: input.crashRecoveryPassed ? weights.scalabilityOperations : 0,
    commercialEngineReadiness:
      input.packageVerificationPassed && allTargets
        ? weights.commercialEngineReadiness
        : 0,
  };

  const blockers: string[] = [];
  if (input.unresolvedSeverityNineOrTen) blockers.push(`${input.unresolvedSeverityNineOrTen} unresolved severity-9/10 defects`);
  if (!input.ownershipCoveragePassed) blockers.push("ownership coverage is incomplete");
  if (!input.transitionCoveragePassed) blockers.push("status-transition coverage is incomplete");
  if (!input.crashRecoveryPassed) blockers.push("crash-recovery gate has not passed");
  if (!input.exactHashesUnique) blockers.push("exact-hash uniqueness has not passed");
  if (!input.perceptualDuplicateScanPassed) blockers.push("perceptual duplicate stack has not passed");
  if (!renderTruth) blockers.push("render-truthfulness evidence has not passed");
  if (!visualQuality) blockers.push("visual-quality evidence has not passed");
  if (characterCoverage < 1) blockers.push(`character coverage ${(characterCoverage * 100).toFixed(2)}%`);
  if (fxCoverage < 1) blockers.push(`FX/texture coverage ${(fxCoverage * 100).toFixed(2)}%`);
  if (!input.sequenceSynchronizationPassed) blockers.push("sequence synchronization has not passed");
  if (!input.originalityReviewPassed) blockers.push("originality/IP review has not passed");
  if (!input.publicationGatePassed) blockers.push("publication gate has not passed");
  if (input.publicationFailureRate > 0.02) {
    blockers.push(`publication failure rate ${(input.publicationFailureRate * 100).toFixed(2)}% exceeds 2%`);
  }
  if (!input.packageVerificationPassed || !allTargets) blockers.push("engine-package verification is incomplete");
  if (!input.mandatoryTestsExecuted) blockers.push("mandatory test suite has not been fully executed");
  if (input.mandatoryTestPassRate < 0.99) {
    blockers.push(`mandatory test pass rate ${(input.mandatoryTestPassRate * 100).toFixed(2)}% is below 99%`);
  }
  if (input.blockerTestFailures) blockers.push(`${input.blockerTestFailures} blocker-test failures`);

  const rawScore = Object.values(categories).reduce((sum, value) => sum + value, 0);
  const gatePassed = blockers.length === 0 && rawScore === MAX_PRODUCTION_SCORE;
  const score = gatePassed ? MAX_PRODUCTION_SCORE : Math.min(rawScore, MAX_PRODUCTION_SCORE - 1);
  return { rawScore, score, capped: score !== rawScore, categories, blockers, gatePassed };
}
