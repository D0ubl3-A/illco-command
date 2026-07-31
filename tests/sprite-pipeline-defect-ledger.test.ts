import assert from "node:assert/strict";
import test from "node:test";
import { assertNoUnresolvedCriticalDefects, rankDefects, type Defect } from "../lib/sprite-pipeline/defect-ledger";

function defect(overrides: Partial<Defect> = {}): Defect {
  return {
    issueId: "SPR-DEF-000001",
    surgeonVoters: [1, 2, 3],
    dissentingSurgeons: [4],
    subsystem: "render-truthfulness",
    description: "Rendered status can be claimed without current file evidence",
    evidenceIds: ["evidence-001"],
    severity: 10,
    probability: 9,
    impact: 10,
    detectability: 3,
    blocker: true,
    scoreLoss: 1200,
    rootCause: "Admission path did not require byte-level evidence",
    repair: "Require verified file evidence before rendered_unvalidated transition",
    owner: 101,
    dependencies: [],
    status: "open",
    validationPlan: "Run admission tests with missing, corrupt, and valid PNG evidence",
    regressionRisk: 8,
    openedAt: "2026-07-31T06:00:00.000Z",
    updatedAt: "2026-07-31T06:01:00.000Z",
    ...overrides,
  };
}

test("ranks release blockers before lower-severity work", () => {
  const low = defect({
    issueId: "SPR-DEF-000002",
    blocker: false,
    severity: 5,
    probability: 5,
    impact: 5,
    scoreLoss: 9000,
    surgeonVoters: [9],
    dissentingSurgeons: [],
  });
  const ranked = rankDefects([low, defect()]);
  assert.deepEqual(ranked.map((item) => item.issueId), ["SPR-DEF-000001", "SPR-DEF-000002"]);
  assert.equal(ranked[0].voteCount, 3);
  assert.equal(ranked[0].dissentCount, 1);
});

test("excludes verified defects from the active queue", () => {
  const ranked = rankDefects([defect({ status: "verified" })]);
  assert.deepEqual(ranked, []);
});

test("rejects duplicate votes and vote-dissent overlap", () => {
  assert.throws(() => rankDefects([defect({ surgeonVoters: [1, 1] })]), /duplicate surgeons/);
  assert.throws(() => rankDefects([defect({ surgeonVoters: [1], dissentingSurgeons: [1] })]), /both vote and dissent/);
});

test("rejects unknown dependencies and duplicate defect IDs", () => {
  assert.throws(() => rankDefects([defect({ dependencies: ["SPR-DEF-999999"] })]), /unknown dependency/);
  assert.throws(() => rankDefects([defect(), defect()]), /duplicate defect ID/);
});

test("blocks release while severity-9 or severity-10 defects remain unresolved", () => {
  assert.throws(() => assertNoUnresolvedCriticalDefects([defect()]), /unresolved severity-9\/10 defects/);
  assert.doesNotThrow(() => assertNoUnresolvedCriticalDefects([defect({ status: "verified" })]));
});
