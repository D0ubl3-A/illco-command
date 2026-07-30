import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contentAddressedRelativePath, storeObjectAtomic, verifyStoredObject } from "../lib/sprite-pipeline/atomic-storage";

async function withRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "sprite-store-"));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}

test("stores bytes atomically at a content-addressed path", async () => withRoot(async (root) => {
  const bytes = Buffer.from("real sprite bytes");
  const result = await storeObjectAtomic(bytes, "png", { root });
  assert.equal(result.reused, false);
  assert.equal(result.relativePath, contentAddressedRelativePath(result.sha256, "png"));
  assert.deepEqual(await readFile(result.absolutePath), bytes);
  await verifyStoredObject(root, result.relativePath, result.sha256);
}));

test("idempotent replay reuses the canonical object", async () => withRoot(async (root) => {
  const bytes = Buffer.from("same immutable bytes");
  const first = await storeObjectAtomic(bytes, "png", { root });
  const second = await storeObjectAtomic(bytes, "png", { root });
  assert.equal(second.reused, true);
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.absolutePath, second.absolutePath);
}));

test("rejects empty, oversized and unsafe extension inputs", async () => withRoot(async (root) => {
  await assert.rejects(() => storeObjectAtomic(new Uint8Array(), "png", { root }), /empty/i);
  await assert.rejects(() => storeObjectAtomic(Buffer.alloc(9), "png", { root, maxBytes: 8 }), /exceeds/i);
  await assert.rejects(() => storeObjectAtomic(Buffer.from("x"), "../png", { root }), /extension/i);
}));

test("detects post-commit object tampering", async () => withRoot(async (root) => {
  const stored = await storeObjectAtomic(Buffer.from("original"), "png", { root });
  await writeFile(stored.absolutePath, Buffer.from("tampered"));
  await assert.rejects(() => verifyStoredObject(root, stored.relativePath, stored.sha256), /hash mismatch/i);
  await assert.rejects(() => storeObjectAtomic(Buffer.from("original"), "png", { root }), /corruption/i);
}));

test("verification rejects path escape", async () => withRoot(async (root) => {
  await assert.rejects(() => verifyStoredObject(root, "../escape.png", "a".repeat(64)), /escapes/i);
}));
