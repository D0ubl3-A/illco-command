export const FAILURE_CLASSES = [
  "timeout","rate_limit","network","malformed_response","policy_rejection","wrong_dimensions",
  "wrong_background","alpha_failure","chroma_failure","edge_failure","clipping_failure","text_logo",
  "likeness_ip","drift","phase_mismatch","duplicate","corruption","archive_mismatch","package_failure",
  "publication_failure",
] as const;

export type FailureClass = (typeof FAILURE_CLASSES)[number];
export type FailureDecision = {
  action: "retry" | "revise_prompt" | "quarantine" | "block";
  delayMs: number;
  nextAttempt: number;
  sameAssetId: true;
};

const RETRYABLE = new Set<FailureClass>(["timeout","rate_limit","network","malformed_response","wrong_dimensions","wrong_background","alpha_failure","chroma_failure","edge_failure","clipping_failure","archive_mismatch","package_failure","publication_failure"]);
const REVISE = new Set<FailureClass>(["wrong_dimensions","wrong_background","alpha_failure","chroma_failure","edge_failure","clipping_failure","text_logo","drift","phase_mismatch","duplicate"]);
const IMMEDIATE_BLOCK = new Set<FailureClass>(["policy_rejection","likeness_ip","corruption"]);

export function classifyFailure(raw: string): FailureClass {
  const value = raw.toLowerCase();
  const rules: Array<[FailureClass, RegExp]> = [
    ["rate_limit", /429|rate.?limit|too many requests/], ["timeout", /timeout|timed out|deadline/],
    ["network", /network|econn|dns|socket|connection reset/], ["malformed_response", /malformed|invalid json|parse/],
    ["policy_rejection", /policy|safety filter|content filter/], ["wrong_dimensions", /dimension|resolution|size mismatch/],
    ["wrong_background", /background/], ["alpha_failure", /alpha|transparen/], ["chroma_failure", /chroma|green spill/],
    ["edge_failure", /edge contamination|halo/], ["clipping_failure", /clip|crop/], ["text_logo", /text|logo|watermark/],
    ["likeness_ip", /likeness|celebrity|trademark|copyright|ip risk/], ["drift", /drift|continuity/],
    ["phase_mismatch", /phase|sequence mismatch/], ["duplicate", /duplicate|collision/], ["corruption", /corrupt|checksum/],
    ["archive_mismatch", /archive/], ["package_failure", /package|engine import/], ["publication_failure", /publish|publication/],
  ];
  return rules.find(([, pattern]) => pattern.test(value))?.[0] ?? "malformed_response";
}

export function decideFailure(failure: FailureClass, attempt: number, maxAttempts = 4, baseDelayMs = 1000): FailureDecision {
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error("attempt must be a positive integer");
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new Error("maxAttempts must be positive");
  if (IMMEDIATE_BLOCK.has(failure)) return { action: failure === "corruption" ? "quarantine" : "block", delayMs: 0, nextAttempt: attempt, sameAssetId: true };
  if (attempt >= maxAttempts) return { action: "quarantine", delayMs: 0, nextAttempt: attempt, sameAssetId: true };
  const action = REVISE.has(failure) ? "revise_prompt" : RETRYABLE.has(failure) ? "retry" : "quarantine";
  const delayMs = action === "quarantine" ? 0 : Math.min(baseDelayMs * 2 ** (attempt - 1), 60_000);
  return { action, delayMs, nextAttempt: action === "quarantine" ? attempt : attempt + 1, sameAssetId: true };
}
