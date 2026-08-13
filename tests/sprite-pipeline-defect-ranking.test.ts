import assert from "node:assert/strict";
import test from "node:test";
import { evidenceBackedScore, rankDefects, type DefectRecord } from "../lib/sprite-pipeline/defect-ranking";

function defect(overrides: Partial<DefectRecord> = {}): DefectRecord {
  return {
    issueId: "DEF-001", surgeonVoters: [1, 2], dissent: [], subsystem: "coverage", description: "missing range",
    evidence: ["evidence/run-1/result.json"], severity: 5, probability: 5, impact: 5, detectability: 5,
    blocker: false, scoreLoss: 100, rootCause: "allocator gap", repair: "reallocate", owner: 10,
    dependencies: [], status: "open", validationPlan: "rerun coverage", regressionRisk: 4,
    openedAt: "2026-07-30T08:00:00.000Z", updatedAt: "2026-07-30T08:00:00.000Z", ...overrides,
  };
}

test("ranks release blockers ahead of ordinary score gains", () => {
  const ranked = rankDefects([
    defect({ issueId: "NORMAL", scoreLoss: 900, severity: 8, probability: 8, impact: 8 }),
    defect({ issueId: "BLOCKER", blocker: true, severity: 9, scoreLoss: 10 }),
  ]);
  assert.equal(ranked[0].issueId, "BLOCKER");
});

test("preserves independent vote count and deterministic tie break", () => {
  const ranked = rankDefects([
    defect({ issueId: "B", surgeonVoters: [1] }),
    defect({ issueId: "A", surgeonVoters: [1, 2, 3] }),
  ]);
  assert.equal(ranked[0].issueId, "A");
  assert.equal(ranked[0].voteCount, 3);
});

test("rejects duplicate surgeon votes", () => {
  assert.throws(() => rankDefects([defect({ surgeonVoters: [7, 7] })]), /unique/);
});

test("awards zero where executable evidence is absent", () => {
  const scored = evidenceBackedScore({ architecture: 1200, continuity: 1000 }, { architecture: 4 }, []);
  assert.equal(scored.categories.architecture, 1200);
  assert.equal(scored.categories.continuity, 0);
  assert.equal(scored.total, 1200);
});

test("caps score below 10000 while severity-nine blocker remains", () => {
  const scored = evidenceBackedScore(
    { architecture: 1200, continuity: 1000, manifest: 1000, renderTruthfulness: 1200, duplication: 1000, characterCoverage: 900, fxCoverage: 900, visualQuality: 1000, operations: 900, commercialReadiness: 900 },
    { architecture: 1, continuity: 1, manifest: 1, renderTruthfulness: 1, duplication: 1, characterCoverage: 1, fxCoverage: 1, visualQuality: 1, operations: 1, commercialReadiness: 1 },
    [defect({ severity: 9, blocker: true })],
  );
  assert.equal(scored.total, 9999);
  assert.equal(scored.gatePassed, false);
});
