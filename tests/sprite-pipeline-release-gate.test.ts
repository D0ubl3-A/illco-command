import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { evaluateReleaseGate, SCORE_WEIGHTS, type CategoryEvidence, type ReleaseGateInput } from "../lib/sprite-pipeline/release-gate";

function evidenceSlug(category: string): string {
  return category.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function createEvidenceFixture(): { root: string; categories: CategoryEvidence[] } {
  const root = mkdtempSync(join(tmpdir(), "sprite-release-evidence-"));
  const categories = Object.entries(SCORE_WEIGHTS).map(([category, earned]) => {
    const path = `evidence/${evidenceSlug(category)}.json`;
    const content = JSON.stringify({ category, earned, executed: true });
    const absolutePath = join(root, path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content, { encoding: "utf8", flag: "wx" });
    return {
      category: category as keyof typeof SCORE_WEIGHTS,
      earned,
      evidence: [{ path, sha256: sha256(content) }],
      mandatoryTestsExecuted: true,
    };
  });
  return { root, categories };
}

function passingInput(): ReleaseGateInput {
  const fixture = createEvidenceFixture();
  return {
    evidenceRoot: fixture.root,
    categories: fixture.categories,
    unresolvedSeverityNineOrTen: 0,
    blockerFailures: 0,
    overallPassRate: 0.995,
    publicationFailureRate: 0.01,
    ownershipComplete: true,
    transitionIntegrity: true,
    idempotencyIntegrity: true,
    archiveIntegrity: true,
    packageIntegrity: true,
    falseRenderClaims: 0,
    duplicateIds: 0,
    filenameCollisions: 0,
    corruptValidatedFiles: 0,
    continuityGaps: 0,
    unauthorizedOverwrites: 0,
    crashRecoveryPassed: true,
    realCharacterE2EPassed: true,
    realFxE2EPassed: true,
    sequenceSyncPassed: true,
    engineImportPassed: true,
    originalityReviewPassed: true,
  };
}

function withInput(run: (input: ReleaseGateInput) => void): void {
  const input = passingInput();
  try {
    run(input);
  } finally {
    rmSync(input.evidenceRoot, { recursive: true, force: true });
  }
}

test("passes only the complete evidence-backed 10K gate", () => {
  withInput((input) => {
    const result = evaluateReleaseGate(input);
    assert.equal(result.score, 10_000);
    assert.equal(result.passed, true, result.failures.join("\n"));
  });
});

test("refuses points without evidence", () => {
  withInput((input) => {
    input.categories[0] = { ...input.categories[0], evidence: [] };
    const result = evaluateReleaseGate(input);
    assert.equal(result.passed, false);
    assert.match(result.failures.join("\n"), /Missing executable evidence/);
    assert.equal(result.score < 10_000, true);
  });
});

test("rejects claimed evidence that does not exist", () => {
  withInput((input) => {
    input.categories[0] = {
      ...input.categories[0],
      evidence: [{ path: "evidence/missing.json", sha256: sha256("missing") }],
    };
    const result = evaluateReleaseGate(input);
    assert.equal(result.passed, false);
    assert.match(result.failures.join("\n"), /Evidence file missing/);
    assert.equal(result.categoryScores.architecture, 0);
  });
});

test("rejects evidence whose bytes do not match the registered hash", () => {
  withInput((input) => {
    input.categories[0] = {
      ...input.categories[0],
      evidence: [{ ...input.categories[0].evidence[0], sha256: sha256("forged-content") }],
    };
    const result = evaluateReleaseGate(input);
    assert.equal(result.passed, false);
    assert.match(result.failures.join("\n"), /Evidence hash mismatch/);
    assert.equal(result.categoryScores.architecture, 0);
  });
});

test("rejects malformed evidence hashes", () => {
  withInput((input) => {
    input.categories[0] = {
      ...input.categories[0],
      evidence: [{ path: "evidence/architecture.json", sha256: "not-a-hash" }],
    };
    const result = evaluateReleaseGate(input);
    assert.equal(result.passed, false);
    assert.match(result.failures.join("\n"), /Invalid evidence SHA-256/);
    assert.equal(result.score < 10_000, true);
  });
});

test("rejects evidence path reuse across categories", () => {
  withInput((input) => {
    input.categories[1] = {
      ...input.categories[1],
      evidence: [{
        path: input.categories[0].evidence[0].path,
        sha256: input.categories[0].evidence[0].sha256,
      }],
    };
    const result = evaluateReleaseGate(input);
    assert.equal(result.passed, false);
    assert.match(result.failures.join("\n"), /reused across categories/);
    assert.equal(result.score < 10_000, true);
  });
});

test("rejects evidence hash reuse across categories regardless of hex casing", () => {
  withInput((input) => {
    const source = join(input.evidenceRoot, input.categories[0].evidence[0].path);
    const targetPath = "evidence/distinct-path.json";
    const target = join(input.evidenceRoot, targetPath);
    writeFileSync(target, readFixture(source), { encoding: "utf8", flag: "wx" });
    input.categories[1] = {
      ...input.categories[1],
      evidence: [{
        path: targetPath,
        sha256: input.categories[0].evidence[0].sha256.toUpperCase(),
      }],
    };
    const result = evaluateReleaseGate(input);
    assert.equal(result.passed, false);
    assert.match(result.failures.join("\n"), /Evidence content reused across categories/);
    assert.equal(result.score < 10_000, true);
  });
});

function readFixture(path: string): string {
  return require("node:fs").readFileSync(path, "utf8") as string;
}

test("rejects unsafe evidence paths", () => {
  withInput((input) => {
    input.categories[0] = {
      ...input.categories[0],
      evidence: [{ path: "../evidence.json", sha256: sha256("unsafe") }],
    };
    const result = evaluateReleaseGate(input);
    assert.equal(result.passed, false);
    assert.match(result.failures.join("\n"), /Unsafe or noncanonical evidence path/);
    assert.equal(result.score < 10_000, true);
  });
});

test("rejects noncanonical evidence path aliases", () => {
  for (const path of ["evidence//proof.json", "evidence/./proof.json", "evidence/trailing/"]) {
    withInput((input) => {
      input.categories[0] = {
        ...input.categories[0],
        evidence: [{ path, sha256: sha256(`alias:${path}`) }],
      };
      const result = evaluateReleaseGate(input);
      assert.equal(result.passed, false, path);
      assert.match(result.failures.join("\n"), /Unsafe or noncanonical evidence path/, path);
      assert.equal(result.score < 10_000, true, path);
    });
  }
});

test("rejects case-variant evidence path aliases", () => {
  withInput((input) => {
    input.categories[1] = {
      ...input.categories[1],
      evidence: [{
        path: input.categories[0].evidence[0].path.toUpperCase(),
        sha256: sha256("case-variant-path"),
      }],
    };
    const result = evaluateReleaseGate(input);
    assert.equal(result.passed, false);
    assert.match(result.failures.join("\n"), /Unsafe or noncanonical evidence path/);
    assert.equal(result.score < 10_000, true);
  });
});

test("caps a failed gate below 10K even when category evidence totals 10K", () => {
  withInput((input) => {
    input.falseRenderClaims = 1;
    const result = evaluateReleaseGate(input);
    assert.equal(result.score, 9_999);
    assert.equal(result.passed, false);
    assert.match(result.failures.join("\n"), /False render claims: 1/);
  });
});

test("rejects truthy non-boolean gate flags at runtime", () => {
  withInput((typedInput) => {
    const input = typedInput as unknown as Record<string, unknown>;
    input.ownershipComplete = "false";
    assert.throws(
      () => evaluateReleaseGate(input as unknown as ReleaseGateInput),
      /ownershipComplete must be boolean/,
    );
  });
});

test("rejects malformed non-integer blocker counts", () => {
  withInput((typedInput) => {
    const input = typedInput as unknown as Record<string, unknown>;
    input.falseRenderClaims = Number.NaN;
    assert.throws(
      () => evaluateReleaseGate(input as unknown as ReleaseGateInput),
      /falseRenderClaims must be a non-negative safe integer/,
    );
  });
});

test("rejects unknown score categories before they can affect accounting", () => {
  withInput((typedInput) => {
    const input = typedInput as unknown as { categories: Array<Record<string, unknown>> };
    input.categories[0] = { ...input.categories[0], category: "inventedCredit" };
    assert.throws(
      () => evaluateReleaseGate(input as unknown as ReleaseGateInput),
      /Unknown score category: inventedCredit/,
    );
  });
});

test("rejects truthy non-boolean mandatory-test evidence", () => {
  withInput((typedInput) => {
    const input = typedInput as unknown as { categories: Array<Record<string, unknown>> };
    input.categories[0] = { ...input.categories[0], mandatoryTestsExecuted: "yes" };
    assert.throws(
      () => evaluateReleaseGate(input as unknown as ReleaseGateInput),
      /mandatoryTestsExecuted\.architecture must be boolean/,
    );
  });
});
