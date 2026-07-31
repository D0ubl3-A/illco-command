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

export const SCORE_CATEGORIES = Object.freeze(
  Object.keys(SCORE_WEIGHTS) as ScoreCategory[],
);

export function isScoreCategory(value: unknown): value is ScoreCategory {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SCORE_WEIGHTS, value);
}

const total = SCORE_CATEGORIES.reduce((sum, category) => sum + SCORE_WEIGHTS[category], 0);
if (total !== 10_000) {
  throw new Error(`Sprite pipeline score weights must total 10000, received ${total}`);
}
