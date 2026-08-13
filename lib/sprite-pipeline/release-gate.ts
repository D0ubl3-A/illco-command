import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

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

export type EvidenceReference = {
  path: string;
  sha256: string;
};

export type CategoryEvidence = {
  category: ScoreCategory;
  earned: number;
  evidence: EvidenceReference[];
  mandatoryTestsExecuted: boolean;
};

export type ReleaseGateInput = {
  evidenceRoot: string;
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

const SHA256 = /^[a-f0-9]{64}$/i;
const SAFE_EVIDENCE_PATH = /^[a-z0-9][a-z0-9._/-]*$/i;
const SCORE_CATEGORIES = new Set<string>(Object.keys(SCORE_WEIGHTS));
const MAX_RELEASE_SCORE = Object.values(SCORE_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
const FAILED_GATE_SCORE_CAP = MAX_RELEASE_SCORE - 1;

if (MAX_RELEASE_SCORE !== 10_000) {
  throw new Error(`Release score weights must total 10000, received ${MAX_RELEASE_SCORE}`);
}

function requireBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`);
  return value;
}

function requireNonNegativeSafeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
  return value as number;
}

function requireRate(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be a finite number between 0 and 1`);
  }
  return value;
}

function canonicalEvidencePath(value: unknown): string | null {
  if (typeof value !== "string" || !value || !SAFE_EVIDENCE_PATH.test(value) || value.startsWith("/") || value.includes("\\")) {
    return null;
  }

  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return null;
  }

  const canonical = segments.join("/").toLowerCase();
  return canonical === value ? canonical : null;
}

function canonicalEvidenceRoot(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || !isAbsolute(value)) {
    throw new TypeError("evidenceRoot must be a non-empty absolute path");
  }
  const resolved = resolve(value);
  let real: string;
  try {
    real = realpathSync(resolved);
  } catch {
    throw new Error(`Evidence root does not exist: ${resolved}`);
  }
  if (!statSync(real).isDirectory()) throw new Error(`Evidence root is not a directory: ${real}`);
  return real;
}

function verifyEvidenceFile(
  evidenceRoot: string,
  category: ScoreCategory,
  canonicalPath: string,
  expectedSha256: string,
  failures: string[],
): boolean {
  const candidate = resolve(evidenceRoot, canonicalPath);
  const rel = relative(evidenceRoot, candidate);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    failures.push(`Evidence path escapes root for ${category}: ${canonicalPath}`);
    return false;
  }

  let realCandidate: string;
  try {
    realCandidate = realpathSync(candidate);
  } catch {
    failures.push(`Evidence file missing for ${category}: ${canonicalPath}`);
    return false;
  }

  const realRel = relative(evidenceRoot, realCandidate);
  if (realRel === "" || realRel === ".." || realRel.startsWith(`..${sep}`) || isAbsolute(realRel)) {
    failures.push(`Evidence symlink escapes root for ${category}: ${canonicalPath}`);
    return false;
  }

  let stats;
  try {
    stats = statSync(realCandidate);
  } catch {
    failures.push(`Evidence file unreadable for ${category}: ${canonicalPath}`);
    return false;
  }
  if (!stats.isFile()) {
    failures.push(`Evidence path is not a regular file for ${category}: ${canonicalPath}`);
    return false;
  }
  if (stats.size <= 0) {
    failures.push(`Evidence file is empty for ${category}: ${canonicalPath}`);
    return false;
  }

  let actualSha256: string;
  try {
    actualSha256 = createHash("sha256").update(readFileSync(realCandidate)).digest("hex");
  } catch {
    failures.push(`Evidence file unreadable for ${category}: ${canonicalPath}`);
    return false;
  }
  if (actualSha256 !== expectedSha256) {
    failures.push(`Evidence hash mismatch for ${category}: ${canonicalPath}`);
    return false;
  }
  return true;
}

function validateEvidenceReferences(
  evidenceRoot: string,
  category: ScoreCategory,
  references: EvidenceReference[],
  globallySeenPaths: Set<string>,
  globallySeenHashes: Set<string>,
  failures: string[],
): boolean {
  if (!Array.isArray(references)) throw new TypeError(`Evidence references for ${category} must be an array`);
  if (references.length === 0) {
    failures.push(`Missing executable evidence for ${category}`);
    return false;
  }

  let valid = true;
  const localPaths = new Set<string>();
  const localHashes = new Set<string>();
  for (const reference of references) {
    if (!reference || typeof reference !== "object") throw new TypeError(`Evidence reference for ${category} must be an object`);
    const canonicalPath = canonicalEvidencePath(reference.path);
    if (!canonicalPath) {
      failures.push(`Unsafe or noncanonical evidence path for ${category}: ${String(reference.path)}`);
      valid = false;
    }
    const hashIsValid = typeof reference.sha256 === "string" && SHA256.test(reference.sha256);
    if (!hashIsValid) {
      failures.push(`Invalid evidence SHA-256 for ${category}: ${String(reference.path)}`);
      valid = false;
    }
    const canonicalSha256 = hashIsValid ? reference.sha256.toLowerCase() : "";
    if (canonicalPath && localPaths.has(canonicalPath)) {
      failures.push(`Duplicate evidence path within ${category}: ${canonicalPath}`);
      valid = false;
    }
    if (hashIsValid && localHashes.has(canonicalSha256)) {
      failures.push(`Duplicate evidence content within ${category}: ${canonicalSha256}`);
      valid = false;
    }
    if (canonicalPath) localPaths.add(canonicalPath);
    if (hashIsValid) localHashes.add(canonicalSha256);
    if (canonicalPath && globallySeenPaths.has(canonicalPath)) {
      failures.push(`Evidence path reused across categories: ${canonicalPath}`);
      valid = false;
    }
    if (hashIsValid && globallySeenHashes.has(canonicalSha256)) {
      failures.push(`Evidence content reused across categories: ${canonicalSha256}`);
      valid = false;
    }
    if (canonicalPath) globallySeenPaths.add(canonicalPath);
    if (hashIsValid) globallySeenHashes.add(canonicalSha256);
    if (canonicalPath && hashIsValid && !verifyEvidenceFile(evidenceRoot, category, canonicalPath, canonicalSha256, failures)) {
      valid = false;
    }
  }
  return valid;
}

export function evaluateReleaseGate(input: ReleaseGateInput): ReleaseGateResult {
  if (!input || typeof input !== "object") throw new TypeError("release gate input must be an object");
  if (!Array.isArray(input.categories)) throw new TypeError("categories must be an array");
  const evidenceRoot = canonicalEvidenceRoot(input.evidenceRoot);

  const countFields = [
    "unresolvedSeverityNineOrTen",
    "blockerFailures",
    "falseRenderClaims",
    "duplicateIds",
    "filenameCollisions",
    "corruptValidatedFiles",
    "continuityGaps",
    "unauthorizedOverwrites",
  ] as const;
  for (const field of countFields) requireNonNegativeSafeInteger(input[field], field);

  requireRate(input.overallPassRate, "overallPassRate");
  requireRate(input.publicationFailureRate, "publicationFailureRate");

  const booleanFields = [
    "ownershipComplete",
    "transitionIntegrity",
    "idempotencyIntegrity",
    "archiveIntegrity",
    "packageIntegrity",
    "crashRecoveryPassed",
    "realCharacterE2EPassed",
    "realFxE2EPassed",
    "sequenceSyncPassed",
    "engineImportPassed",
    "originalityReviewPassed",
  ] as const;
  for (const field of booleanFields) requireBoolean(input[field], field);

  const failures: string[] = [];
  const categoryScores = Object.fromEntries(Object.keys(SCORE_WEIGHTS).map((key) => [key, 0])) as Record<ScoreCategory, number>;
  const seen = new Set<ScoreCategory>();
  const globallySeenEvidencePaths = new Set<string>();
  const globallySeenEvidenceHashes = new Set<string>();

  for (const evidence of input.categories) {
    if (!evidence || typeof evidence !== "object") throw new TypeError("category evidence must be an object");
    if (typeof evidence.category !== "string" || !SCORE_CATEGORIES.has(evidence.category)) {
      throw new RangeError(`Unknown score category: ${String(evidence.category)}`);
    }
    const category = evidence.category as ScoreCategory;
    requireBoolean(evidence.mandatoryTestsExecuted, `mandatoryTestsExecuted.${category}`);
    if (seen.has(category)) failures.push(`Duplicate score category: ${category}`);
    seen.add(category);
    const max = SCORE_WEIGHTS[category];
    if (!Number.isInteger(evidence.earned) || evidence.earned < 0 || evidence.earned > max) {
      failures.push(`Invalid score for ${category}`);
      continue;
    }

    const referencesValid = validateEvidenceReferences(
      evidenceRoot,
      category,
      evidence.evidence,
      globallySeenEvidencePaths,
      globallySeenEvidenceHashes,
      failures,
    );

    if (evidence.earned > 0 && (!evidence.mandatoryTestsExecuted || !referencesValid)) {
      if (!evidence.mandatoryTestsExecuted) failures.push(`Mandatory tests not executed for ${category}`);
      continue;
    }
    categoryScores[category] = evidence.earned;
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

  if (input.overallPassRate < 0.99) failures.push("Overall pass rate below 99%");
  if (input.publicationFailureRate > 0.02) failures.push("Publication failure rate above 2%");

  const rawScore = (Object.keys(categoryScores) as ScoreCategory[]).reduce((sum, key) => sum + categoryScores[key], 0);
  if (rawScore !== MAX_RELEASE_SCORE) failures.push(`Evidence-backed score is ${rawScore}, not ${MAX_RELEASE_SCORE}`);

  const passed = failures.length === 0;
  const score = passed ? rawScore : Math.min(rawScore, FAILED_GATE_SCORE_CAP);
  return { score, passed, failures, categoryScores };
}
