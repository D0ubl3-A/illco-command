import assert from "node:assert/strict";
import test from "node:test";
import {
  sha256Canonical,
  verifyArchiveManifest,
  verifyEnginePackage,
  type ArchiveManifest,
  type EnginePackage,
} from "../lib/sprite-pipeline/archive-package";

const FILE_SHA = "a".repeat(64);
const FILE = {
  path: `objects/${FILE_SHA.slice(0, 2)}/${FILE_SHA}.png`,
  sha256: FILE_SHA,
  bytes: 4096,
};

function archive(): ArchiveManifest {
  const base = {
    archiveId: "archive-run-001",
    runId: "run-001",
    createdAt: "2026-07-30T06:00:00.000Z",
    codeVersion: "commit-abc",
    schemaVersion: "20260729",
    continuityPointer: "character-00001",
    files: [FILE],
  };
  return { ...base, manifestSha256: sha256Canonical(base) };
}

function enginePackage(): EnginePackage {
  const base = {
    packageId: "package-unity-001",
    archiveId: "archive-run-001",
    target: "unity" as const,
    createdAt: "2026-07-30T06:01:00.000Z",
    assetIds: ["character-00001"],
    files: [FILE],
    metadata: { pixelsPerUnit: 100, pivot: [0.5, 0], filterMode: "Point" },
  };
  return { ...base, packageSha256: sha256Canonical(base) };
}

test("accepts a complete immutable archive manifest", () => {
  const result = verifyArchiveManifest(archive());
  assert.equal(result.passed, true, result.failures.join("\n"));
});

test("detects archive manifest tampering", () => {
  const value = archive();
  value.continuityPointer = "character-09999";
  const result = verifyArchiveManifest(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /hash mismatch/i);
});

test("rejects unsafe and non-content-addressed paths", () => {
  const value = archive();
  value.files = [{ ...FILE, path: "../escape.png" }];
  value.manifestSha256 = sha256Canonical({ ...value, manifestSha256: undefined });
  const result = verifyArchiveManifest(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /unsafe archive path/i);
});

test("accepts a complete Unity package", () => {
  const result = verifyEnginePackage(enginePackage());
  assert.equal(result.passed, true, result.failures.join("\n"));
});

test("rejects engine packages with missing import metadata", () => {
  const value = enginePackage();
  value.metadata = { pivot: [0.5, 0] };
  value.packageSha256 = sha256Canonical({ ...value, packageSha256: undefined });
  const result = verifyEnginePackage(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /pixelsPerUnit/);
  assert.match(result.failures.join("\n"), /filterMode/);
});

test("detects package tampering after signing", () => {
  const value = enginePackage();
  value.assetIds.push("character-00002");
  const result = verifyEnginePackage(value);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /hash mismatch/i);
});
