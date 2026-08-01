import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { executeProductionRun } from "../lib/sprite-pipeline/production-run";
import { packageValidatedRun, verifyPackagedRunOnDisk } from "../lib/sprite-pipeline/production-packaging";
import { verifyArchiveManifest, verifyEnginePackage } from "../lib/sprite-pipeline/archive-package";

const requests = [
  {
    assetId: "character-00001",
    kind: "character" as const,
    seed: 101,
    phase: "contact",
    cameraAngle: "three-quarter-left",
    primary: [175, 42, 76] as [number, number, number],
    secondary: [32, 45, 90] as [number, number, number],
  },
  {
    assetId: "fx-00001",
    kind: "fx" as const,
    seed: 202,
    phase: "contact",
    cameraAngle: "front",
    primary: [255, 156, 32] as [number, number, number],
    secondary: [255, 244, 180] as [number, number, number],
  },
];

test("archives validated bytes and evidence then creates verified engine packages", async () => {
  const root = await mkdtemp(join(tmpdir(), "sprite-package-"));
  try {
    const produced = await executeProductionRun(root, "package-run-001", requests);
    const packaged = await packageValidatedRun(root, produced.runId, produced.continuityPointer, produced.assets, "test-code-sha");
    assert.equal((await stat(packaged.archivePath)).isFile(), true);
    assert.equal(verifyArchiveManifest(packaged.archive).passed, true);
    assert.equal(packaged.archive.files.length, 4);
    assert.equal(packaged.archive.files.filter((file) => file.path.endsWith(".png")).length, 2);
    assert.equal(packaged.archive.files.filter((file) => file.path.endsWith(".json")).length, 2);
    assert.deepEqual(packaged.packages.map((entry) => entry.target), ["unity", "godot", "unreal", "generic"]);
    for (const entry of packaged.packages) {
      assert.equal((await stat(entry.path)).isFile(), true);
      assert.equal(verifyEnginePackage(entry.manifest).passed, true);
      assert.deepEqual(entry.manifest.assetIds, ["character-00001", "fx-00001"]);
      assert.equal(entry.manifest.files.length, 4);
      const persisted = JSON.parse(await readFile(entry.path, "utf8"));
      assert.equal(persisted.packageSha256, entry.manifest.packageSha256);
    }
    const persistedCheck = await verifyPackagedRunOnDisk(root, packaged);
    assert.equal(persistedCheck.passed, true);
    assert.equal(persistedCheck.verifiedFiles, 4);
    assert.equal(persistedCheck.verifiedPackages, 4);
    assert.deepEqual(persistedCheck.failures, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses archive creation after validated bytes are altered", async () => {
  const root = await mkdtemp(join(tmpdir(), "sprite-package-tamper-"));
  try {
    const produced = await executeProductionRun(root, "package-run-tamper", requests.slice(0, 1));
    const asset = produced.assets[0];
    await writeFile(asset.path, Buffer.from("tampered"));
    await assert.rejects(
      packageValidatedRun(root, produced.runId, produced.continuityPointer, produced.assets, "test-code-sha"),
      /hash mismatch/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses archive creation after validation evidence is altered", async () => {
  const root = await mkdtemp(join(tmpdir(), "sprite-evidence-tamper-"));
  try {
    const produced = await executeProductionRun(root, "package-run-evidence-tamper", requests.slice(0, 1));
    const asset = produced.assets[0];
    await writeFile(asset.evidencePath, JSON.stringify({ assetId: asset.assetId, state: "validated", sha256: "0".repeat(64) }));
    await assert.rejects(
      packageValidatedRun(root, produced.runId, produced.continuityPointer, produced.assets, "test-code-sha"),
      /evidence.*hash mismatch/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("detects post-package asset tampering during persisted verification", async () => {
  const root = await mkdtemp(join(tmpdir(), "sprite-package-post-tamper-"));
  try {
    const produced = await executeProductionRun(root, "package-run-post-tamper", requests);
    const packaged = await packageValidatedRun(root, produced.runId, produced.continuityPointer, produced.assets, "test-code-sha");
    await writeFile(produced.assets[0].path, Buffer.from("tampered after packaging"));
    const check = await verifyPackagedRunOnDisk(root, packaged);
    assert.equal(check.passed, false);
    assert.match(check.failures.join("\n"), /byte-size mismatch|hash mismatch/i);
    assert.equal(check.verifiedPackages, 4);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("detects package manifest tampering and missing engine targets", async () => {
  const root = await mkdtemp(join(tmpdir(), "sprite-package-manifest-tamper-"));
  try {
    const produced = await executeProductionRun(root, "package-run-manifest-tamper", requests);
    const packaged = await packageValidatedRun(root, produced.runId, produced.continuityPointer, produced.assets, "test-code-sha");
    const unity = packaged.packages.find((entry) => entry.target === "unity");
    assert.ok(unity);
    await writeFile(unity.path, JSON.stringify({ ...unity.manifest, archiveId: "wrong-archive" }));
    const check = await verifyPackagedRunOnDisk(root, {
      ...packaged,
      packages: packaged.packages.filter((entry) => entry.target !== "godot"),
    });
    assert.equal(check.passed, false);
    assert.match(check.failures.join("\n"), /unity package verification failed/i);
    assert.match(check.failures.join("\n"), /missing engine package target: godot/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
