import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { executeProductionRun } from "../lib/sprite-pipeline/production-run";
import { packageValidatedRun } from "../lib/sprite-pipeline/production-packaging";

const request = {
  assetId: "character-00001",
  kind: "character" as const,
  seed: 101,
  phase: "contact",
  cameraAngle: "three-quarter-left",
  primary: [175, 42, 76] as [number, number, number],
  secondary: [32, 45, 90] as [number, number, number],
};

test("archive and package manifests are immutable and leave no partial temp files", async () => {
  const root = await mkdtemp(join(tmpdir(), "sprite-package-atomic-"));
  try {
    const produced = await executeProductionRun(root, "atomic-package-run", [request]);
    const packaged = await packageValidatedRun(
      root,
      produced.runId,
      produced.continuityPointer,
      produced.assets,
      "atomic-test-code",
    );
    const originalArchive = await readFile(packaged.archivePath);

    await assert.rejects(
      packageValidatedRun(
        root,
        produced.runId,
        produced.continuityPointer,
        produced.assets,
        "atomic-test-code",
      ),
      /EEXIST|exist/i,
    );

    assert.deepEqual(await readFile(packaged.archivePath), originalArchive);
    const archiveDirEntries = await readdir(dirname(packaged.archivePath));
    assert.equal(archiveDirEntries.some((name) => name.endsWith(".tmp")), false);
    for (const entry of packaged.packages) {
      const packageDirEntries = await readdir(dirname(entry.path));
      assert.equal(packageDirEntries.some((name) => name.endsWith(".tmp")), false);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
