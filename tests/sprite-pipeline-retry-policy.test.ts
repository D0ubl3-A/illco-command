import assert from "node:assert/strict";
import test from "node:test";
import { decideRetry } from "../lib/sprite-pipeline/retry-policy";

test("uses exponential backoff without changing the asset ID", () => {
  assert.deepEqual(decideRetry("timeout", 1), {
    action: "retry_same_id",
    delayMs: 1000,
    nextAttempt: 2,
    reason: "bounded retry 2/4 for timeout",
  });
  assert.equal(decideRetry("rate_limit", 3).delayMs, 4000);
});

test("requires prompt revision for correctable visual failures", () => {
  const result = decideRetry("chroma_failure", 2);
  assert.equal(result.action, "revise_prompt");
  assert.equal(result.nextAttempt, 3);
});

test("quarantines duplicate and corrupt results immediately", () => {
  assert.equal(decideRetry("duplicate", 1).action, "quarantine");
  assert.equal(decideRetry("corruption", 1).action, "quarantine");
});

test("blocks terminal failures and exhausted retry budgets", () => {
  assert.equal(decideRetry("likeness_ip", 1).action, "block");
  assert.equal(decideRetry("network", 4).action, "block");
});

test("rejects invalid retry counters", () => {
  assert.throws(() => decideRetry("timeout", 0), /positive integer/);
  assert.throws(() => decideRetry("timeout", 1, 0), /maxAttempts/);
});
