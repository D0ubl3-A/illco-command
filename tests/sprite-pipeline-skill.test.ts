import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildSpriteSkillRequests, parseSpriteSkillOptions, runSpriteSkill } from "../scripts/run-sprite-skill";

test("parses bounded skill ranges and builds unique character and FX requests", () => {
  const options = parseSpriteSkillOptions([
    "--root", ".skill-test",
    "--run-id", "skill-contract-001",
    "--characters", "3",
    "--fx", "2",
    "--character-start", "11",
    "--fx-start", "21",
  ]);
  const requests = buildSpriteSkillRequests(options);
  assert.equal(requests.length, 5);
  assert.deepEqual(requests.map((request) => request.assetId), [
    "character-00011",
    "character-00012",
    "character-00013",
    "fx-00021",
    "fx-00022",
  ]);
  assert.equal(new Set(requests.map((request) => request.assetId)).size, 5);
});

test("runs the sprite pipeline as a real skill and verifies persisted packages", async () => {
  const root = await mkdtemp(join(tmpdir(), "sprite-skill-test-"));
  try {
    const summary = await runSpriteSkill([
      "--root", root,
      "--run-id", "skill-real-001",
      "--characters", "2",
      "--fx", "2",
      "--character-start", "1",
      "--fx-start", "1",
    ]);
    assert.equal(summary.skill, "sprite-pipeline-to-10k");
    assert.equal(summary.skillVersion, "1.2.0");
    assert.equal(summary.requested, 4);
    assert.equal(summary.generated, 4);
    assert.equal(summary.validated, 4);
    assert.equal(summary.renderedUnvalidated, 0);
    assert.equal(summary.rejected, 0);
    assert.equal(summary.characters, 2);
    assert.equal(summary.fx, 2);
    assert.equal(summary.packaged, 4);
    assert.equal(summary.archived, 8);
    assert.equal(summary.continuityPointer, "character-00003");
    const verification = summary.packageVerification as {
      passed: boolean;
      verifiedFiles: number;
      verifiedPackages: number;
      failures: string[];
    };
    assert.equal(verification.passed, true);
    assert.equal(verification.verifiedFiles, 8);
    assert.equal(verification.verifiedPackages, 4);
    assert.deepEqual(verification.failures, []);
    const summaryPath = String(summary.summaryPath);
    assert.equal((await stat(summaryPath)).isFile(), true);
    const persisted = JSON.parse(await readFile(summaryPath, "utf8")) as {
      assets: Array<{ path: string; evidencePath: string }>;
      packageVerification: { passed: boolean; verifiedFiles: number; verifiedPackages: number };
    };
    assert.equal(persisted.assets.length, 4);
    assert.equal(persisted.packageVerification.passed, true);
    assert.equal(persisted.packageVerification.verifiedFiles, 8);
    assert.equal(persisted.packageVerification.verifiedPackages, 4);
    for (const asset of persisted.assets) {
      assert.equal((await stat(asset.path)).isFile(), true);
      assert.equal((await stat(asset.evidencePath)).isFile(), true);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("skill rejects invalid and overflowing ranges before production", () => {
  assert.throws(() => parseSpriteSkillOptions(["--run-id", "../escape"]), /run-id/i);
  assert.throws(() => parseSpriteSkillOptions(["--characters", "0"]), /positive integer/i);
  assert.throws(
    () => parseSpriteSkillOptions(["--characters", "2", "--character-start", "10000"]),
    /exceeds character-10000/i,
  );
});
