import { createHash } from "node:crypto";

const SHA256 = /^[a-f0-9]{64}$/i;

export type PublicationRecord = {
  publicationId: string;
  packageId: string;
  archiveId: string;
  target: string;
  destination: string;
  publishedAt: string;
  packageSha256: string;
  receiptSha256: string;
  status: "published" | "failed" | "rolled_back";
  rollbackOf?: string;
};

export type PublicationBatchResult = {
  passed: boolean;
  failures: string[];
  failureRate: number;
  successful: number;
  failed: number;
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function publicationReceiptHash(record: Omit<PublicationRecord, "receiptSha256">): string {
  return createHash("sha256").update(stable(record)).digest("hex");
}

export function validatePublication(record: PublicationRecord): string[] {
  const failures: string[] = [];
  if (!record.publicationId.trim()) failures.push("publicationId is required");
  if (!record.packageId.trim()) failures.push("packageId is required");
  if (!record.archiveId.trim()) failures.push("archiveId is required");
  if (!record.target.trim()) failures.push("target is required");
  if (!record.destination.trim()) failures.push("destination is required");
  if (Number.isNaN(Date.parse(record.publishedAt))) failures.push("publishedAt is invalid");
  if (!SHA256.test(record.packageSha256)) failures.push("packageSha256 is invalid");
  if (!SHA256.test(record.receiptSha256)) failures.push("receiptSha256 is invalid");
  const { receiptSha256: _, ...unsigned } = record;
  if (publicationReceiptHash(unsigned) !== record.receiptSha256) failures.push("publication receipt hash mismatch");
  if (record.status === "rolled_back" && !record.rollbackOf?.trim()) failures.push("rolled-back publication requires rollbackOf");
  if (record.status !== "rolled_back" && record.rollbackOf) failures.push("rollbackOf is only valid for rolled-back records");
  return failures;
}

export function validatePublicationBatch(records: PublicationRecord[], maxFailureRate = 0.02): PublicationBatchResult {
  const failures: string[] = [];
  const ids = new Set<string>();
  const activeDestinations = new Set<string>();
  let failed = 0;
  let successful = 0;
  for (const record of records) {
    const recordFailures = validatePublication(record);
    failures.push(...recordFailures.map((message) => `${record.publicationId || "<missing>"}: ${message}`));
    if (ids.has(record.publicationId)) failures.push(`duplicate publicationId: ${record.publicationId}`);
    ids.add(record.publicationId);
    if (record.status === "failed") failed += 1;
    if (record.status === "published") {
      successful += 1;
      const key = `${record.target}\u0000${record.destination}`;
      if (activeDestinations.has(key)) failures.push(`duplicate active publication destination: ${record.target}/${record.destination}`);
      activeDestinations.add(key);
    }
  }
  const attempted = successful + failed;
  const failureRate = attempted === 0 ? 0 : failed / attempted;
  if (failureRate > maxFailureRate) failures.push(`publication failure rate ${failureRate.toFixed(6)} exceeds ${maxFailureRate}`);
  return { passed: failures.length === 0, failures, failureRate, successful, failed };
}
