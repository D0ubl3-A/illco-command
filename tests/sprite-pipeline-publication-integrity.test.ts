import assert from "node:assert/strict";
import test from "node:test";
import {
  publicationReceiptHash,
  validatePublication,
  validatePublicationBatch,
  type PublicationRecord,
} from "../lib/sprite-pipeline/publication-integrity";

function publication(overrides: Partial<PublicationRecord> = {}): PublicationRecord {
  const unsigned = {
    publicationId: "pub-001",
    packageId: "pkg-001",
    archiveId: "arc-001",
    target: "unity",
    destination: "catalog/character-00001",
    publishedAt: "2026-07-30T22:00:00.000Z",
    packageSha256: "a".repeat(64),
    status: "published" as const,
    ...overrides,
  };
  return { ...unsigned, receiptSha256: publicationReceiptHash(unsigned) };
}

test("accepts a signed publication record", () => {
  assert.deepEqual(validatePublication(publication()), []);
});

test("detects publication receipt tampering", () => {
  const value = publication();
  value.destination = "catalog/character-99999";
  assert.match(validatePublication(value).join("\n"), /hash mismatch/i);
});

test("requires rollback lineage", () => {
  const value = publication({ status: "rolled_back" });
  assert.match(validatePublication(value).join("\n"), /rollbackOf/);
});

test("rejects duplicate active destinations", () => {
  const result = validatePublicationBatch([
    publication(),
    publication({ publicationId: "pub-002" }),
  ]);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /duplicate active publication destination/i);
});

test("enforces the two-percent publication failure gate", () => {
  const records: PublicationRecord[] = [];
  for (let index = 0; index < 49; index += 1) {
    records.push(publication({ publicationId: `pub-ok-${index}`, destination: `catalog/${index}` }));
  }
  records.push(publication({ publicationId: "pub-failed", destination: "catalog/failed", status: "failed" }));
  assert.equal(validatePublicationBatch(records).passed, true);
  records.push(publication({ publicationId: "pub-failed-2", destination: "catalog/failed-2", status: "failed" }));
  const result = validatePublicationBatch(records);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /failure rate/i);
});
