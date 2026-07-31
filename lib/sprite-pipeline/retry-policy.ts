export type FailureClass = "timeout" | "rate_limit" | "network" | "malformed_response" | "wrong_dimensions" | "wrong_background" | "alpha_failure" | "chroma_failure" | "edge_failure" | "clipping_failure" | "drift" | "phase_mismatch" | "duplicate" | "corruption" | "archive_mismatch" | "package_failure" | "publication_failure" | "policy_rejection" | "likeness_ip" | "text_logo";

export type RetryDecision = {
  action: "retry_same_id" | "revise_prompt" | "quarantine" | "block";
  delayMs: number;
  nextAttempt: number;
  reason: string;
};

const promptRevision = new Set<FailureClass>(["wrong_dimensions", "wrong_background", "alpha_failure", "chroma_failure", "edge_failure", "clipping_failure", "drift", "phase_mismatch"]);
const quarantine = new Set<FailureClass>(["duplicate", "corruption", "text_logo"]);
const terminal = new Set<FailureClass>(["policy_rejection", "likeness_ip"]);

export function decideRetry(failure: FailureClass, attempt: number, maxAttempts = 4, baseDelayMs = 1000): RetryDecision {
  if (!Number.isInteger(attempt) || attempt < 1) throw new RangeError("attempt must be a positive integer");
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new RangeError("maxAttempts must be positive");
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) throw new RangeError("baseDelayMs must be nonnegative");
  if (terminal.has(failure)) return { action: "block", delayMs: 0, nextAttempt: attempt, reason: `${failure} requires approved resolution` };
  if (quarantine.has(failure)) return { action: "quarantine", delayMs: 0, nextAttempt: attempt, reason: `${failure} requires isolation` };
  if (attempt >= maxAttempts) return { action: "block", delayMs: 0, nextAttempt: attempt, reason: `retry budget exhausted for ${failure}` };
  return {
    action: promptRevision.has(failure) ? "revise_prompt" : "retry_same_id",
    delayMs: Math.min(60000, baseDelayMs * 2 ** (attempt - 1)),
    nextAttempt: attempt + 1,
    reason: `bounded retry ${attempt + 1}/${maxAttempts} for ${failure}`,
  };
}
