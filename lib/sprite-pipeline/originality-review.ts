import { createHash } from "node:crypto";

export type SimilaritySignal = {
  sourceId: string;
  sourceType: "real-person" | "protected-character" | "brand" | "internal-asset";
  likeness: number;
  wardrobe: number;
  facialGeometry: number;
  silhouette: number;
  palette: number;
  nameSimilarity: number;
  reviewerTool: string;
  reviewerVersion: string;
};

export type OriginalityReviewInput = {
  assetId: string;
  bibleId: string;
  bibleVersion: number;
  originalityDeclaration: string;
  prohibitedLikenessNotes: string[];
  signals: SimilaritySignal[];
  humanReviewRequired: boolean;
  humanReview?: {
    reviewerId: string;
    decision: "approved" | "rejected";
    notes: string;
    reviewedAt: string;
  };
};

export type OriginalityThresholds = {
  maxRealPersonLikeness: number;
  maxProtectedCharacterComposite: number;
  maxBrandComposite: number;
  maxInternalDuplicateComposite: number;
};

export const DEFAULT_ORIGINALITY_THRESHOLDS: OriginalityThresholds = {
  maxRealPersonLikeness: 0.22,
  maxProtectedCharacterComposite: 0.28,
  maxBrandComposite: 0.30,
  maxInternalDuplicateComposite: 0.92,
};

export type OriginalityReviewResult = {
  passed: boolean;
  blocked: boolean;
  failures: string[];
  highestRisk: number;
  evidenceHash: string;
};

function bounded(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function composite(signal: SimilaritySignal): number {
  return (
    signal.likeness * 0.30 +
    signal.facialGeometry * 0.22 +
    signal.wardrobe * 0.15 +
    signal.silhouette * 0.15 +
    signal.nameSimilarity * 0.10 +
    signal.palette * 0.08
  );
}

export function reviewOriginality(
  input: OriginalityReviewInput,
  thresholds: OriginalityThresholds = DEFAULT_ORIGINALITY_THRESHOLDS,
): OriginalityReviewResult {
  const failures: string[] = [];
  if (!/^(character|fx|texture)-\d{5}$/.test(input.assetId)) failures.push("assetId is invalid");
  if (!input.bibleId.trim()) failures.push("bibleId is required");
  if (!Number.isInteger(input.bibleVersion) || input.bibleVersion < 1) failures.push("bibleVersion is invalid");
  if (!input.originalityDeclaration.trim()) failures.push("originality declaration is required");
  if (input.prohibitedLikenessNotes.length === 0) failures.push("prohibited likeness notes are required");
  if (input.signals.length === 0) failures.push("at least one originality similarity signal is required");

  let highestRisk = 0;
  const sourceIds = new Set<string>();
  for (const signal of input.signals) {
    if (!signal.sourceId.trim()) failures.push("similarity signal sourceId is required");
    if (sourceIds.has(signal.sourceId)) failures.push(`duplicate similarity source: ${signal.sourceId}`);
    sourceIds.add(signal.sourceId);
    if (!signal.reviewerTool.trim() || !signal.reviewerVersion.trim()) failures.push(`tool provenance missing for ${signal.sourceId}`);
    const metrics = [signal.likeness, signal.wardrobe, signal.facialGeometry, signal.silhouette, signal.palette, signal.nameSimilarity];
    if (metrics.some((value) => !bounded(value))) failures.push(`invalid similarity score for ${signal.sourceId}`);
    const risk = composite(signal);
    highestRisk = Math.max(highestRisk, risk, signal.likeness);
    if (signal.sourceType === "real-person" && signal.likeness > thresholds.maxRealPersonLikeness) {
      failures.push(`real-person likeness threshold exceeded: ${signal.sourceId}`);
    }
    if (signal.sourceType === "protected-character" && risk > thresholds.maxProtectedCharacterComposite) {
      failures.push(`protected-character similarity threshold exceeded: ${signal.sourceId}`);
    }
    if (signal.sourceType === "brand" && risk > thresholds.maxBrandComposite) {
      failures.push(`brand similarity threshold exceeded: ${signal.sourceId}`);
    }
    if (signal.sourceType === "internal-asset" && risk > thresholds.maxInternalDuplicateComposite) {
      failures.push(`internal originality threshold exceeded: ${signal.sourceId}`);
    }
  }

  if (input.humanReviewRequired) {
    if (!input.humanReview) failures.push("required human originality review is missing");
    else {
      if (!input.humanReview.reviewerId.trim()) failures.push("human reviewerId is required");
      if (!input.humanReview.notes.trim()) failures.push("human review notes are required");
      if (Number.isNaN(Date.parse(input.humanReview.reviewedAt))) failures.push("human reviewedAt is invalid");
      if (input.humanReview.decision !== "approved") failures.push("human originality review rejected the asset");
    }
  }

  const evidenceHash = createHash("sha256").update(canonical(input)).digest("hex");
  return { passed: failures.length === 0, blocked: failures.length > 0, failures, highestRisk, evidenceHash };
}
