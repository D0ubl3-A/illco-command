import { createHash } from "node:crypto";
import { posix } from "node:path";

const SHA256 = /^[a-f0-9]{64}$/i;
const SAFE_PATH = /^[a-z0-9][a-z0-9._/-]*$/;

export type ArchiveFile = {
  path: string;
  sha256: string;
  bytes: number;
};

export type ArchiveManifest = {
  archiveId: string;
  runId: string;
  createdAt: string;
  codeVersion: string;
  schemaVersion: string;
  continuityPointer: string | null;
  files: ArchiveFile[];
  manifestSha256: string;
};

export type EngineTarget = "unity" | "godot" | "unreal" | "generic";

export type EnginePackage = {
  packageId: string;
  archiveId: string;
  target: EngineTarget;
  createdAt: string;
  assetIds: string[];
  files: ArchiveFile[];
  metadata: Record<string, unknown>;
  packageSha256: string;
};

export type IntegrityResult = {
  passed: boolean;
  failures: string[];
  computedHash: string;
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Canonical(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function assertContentAddressedPath(path: string, sha256: string): void {
  if (!SHA256.test(sha256)) throw new Error("Invalid SHA-256 digest");
  if (!SAFE_PATH.test(path) || path.startsWith("/") || path.includes("..") || path.includes("\\")) {
    throw new Error(`Unsafe archive path: ${path}`);
  }
  const normalized = posix.normalize(path);
  if (normalized !== path) throw new Error(`Non-canonical archive path: ${path}`);
  if (!path.includes(sha256.slice(0, 2)) || !path.includes(sha256)) {
    throw new Error(`Path is not content-addressed by ${sha256}`);
  }
}

function validateFiles(files: ArchiveFile[], failures: string[]): void {
  const paths = new Set<string>();
  const hashes = new Set<string>();
  for (const file of files) {
    try {
      assertContentAddressedPath(file.path, file.sha256);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
    if (!Number.isInteger(file.bytes) || file.bytes <= 0) failures.push(`Invalid byte size for ${file.path}`);
    if (paths.has(file.path)) failures.push(`Duplicate archive path: ${file.path}`);
    paths.add(file.path);
    if (hashes.has(file.sha256)) failures.push(`Duplicate file content: ${file.sha256}`);
    hashes.add(file.sha256);
  }
}

export function verifyArchiveManifest(manifest: ArchiveManifest): IntegrityResult {
  const failures: string[] = [];
  if (!manifest.archiveId.trim()) failures.push("archiveId is required");
  if (!manifest.runId.trim()) failures.push("runId is required");
  if (Number.isNaN(Date.parse(manifest.createdAt))) failures.push("createdAt is invalid");
  if (!manifest.codeVersion.trim()) failures.push("codeVersion is required");
  if (!manifest.schemaVersion.trim()) failures.push("schemaVersion is required");
  if (manifest.files.length === 0) failures.push("Archive must contain files");
  validateFiles(manifest.files, failures);
  const computedHash = sha256Canonical({ ...manifest, manifestSha256: undefined });
  if (!SHA256.test(manifest.manifestSha256) || computedHash !== manifest.manifestSha256) {
    failures.push("Archive manifest hash mismatch");
  }
  return { passed: failures.length === 0, failures, computedHash };
}

function requiredMetadataKeys(target: EngineTarget): string[] {
  switch (target) {
    case "unity": return ["pixelsPerUnit", "pivot", "filterMode"];
    case "godot": return ["region", "pivot", "filter"];
    case "unreal": return ["pixelsPerUnrealUnit", "pivot", "compression"];
    case "generic": return ["frameRate", "pivot", "coordinateSystem"];
  }
}

export function verifyEnginePackage(pkg: EnginePackage): IntegrityResult {
  const failures: string[] = [];
  if (!pkg.packageId.trim()) failures.push("packageId is required");
  if (!pkg.archiveId.trim()) failures.push("archiveId is required");
  if (Number.isNaN(Date.parse(pkg.createdAt))) failures.push("createdAt is invalid");
  if (pkg.assetIds.length === 0) failures.push("Package must reference at least one asset");
  if (new Set(pkg.assetIds).size !== pkg.assetIds.length) failures.push("Duplicate asset IDs in package");
  if (pkg.files.length === 0) failures.push("Package must contain files");
  validateFiles(pkg.files, failures);
  for (const key of requiredMetadataKeys(pkg.target)) {
    if (!(key in pkg.metadata)) failures.push(`Missing ${pkg.target} metadata key: ${key}`);
  }
  const computedHash = sha256Canonical({ ...pkg, packageSha256: undefined });
  if (!SHA256.test(pkg.packageSha256) || computedHash !== pkg.packageSha256) {
    failures.push("Package hash mismatch");
  }
  return { passed: failures.length === 0, failures, computedHash };
}
