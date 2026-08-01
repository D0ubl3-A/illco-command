import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import {
  sha256Canonical,
  verifyArchiveManifest,
  verifyEnginePackage,
  type ArchiveFile,
  type ArchiveManifest,
  type EnginePackage,
  type EngineTarget,
} from "./archive-package";
import type { ProducedAsset } from "./production-run";

export type PackagedRun = {
  archive: ArchiveManifest;
  archivePath: string;
  packages: Array<{ target: EngineTarget; manifest: EnginePackage; path: string }>;
};

function toArchivePath(root: string, path: string): string {
  const normalizedRoot = resolve(root);
  const normalizedPath = resolve(path);
  const rel = relative(normalizedRoot, normalizedPath).replaceAll("\\", "/");
  if (!rel || rel.startsWith("../") || rel.includes("/../")) throw new Error(`File escapes production root: ${path}`);
  return rel;
}

async function verifiedFile(root: string, path: string, expectedSha256: string, label: string): Promise<ArchiveFile> {
  const info = await stat(path);
  if (!info.isFile() || info.size <= 0) throw new Error(`Missing ${label}: ${path}`);
  const bytes = await readFile(path);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== expectedSha256) throw new Error(`${label} hash mismatch: ${path}`);
  return { path: toArchivePath(root, path), sha256: digest, bytes: info.size };
}

async function assetFiles(root: string, asset: ProducedAsset): Promise<ArchiveFile[]> {
  if (asset.state !== "validated") throw new Error(`Cannot package non-validated asset ${asset.assetId}`);
  const image = await verifiedFile(root, asset.path, asset.sha256, `validated asset ${asset.assetId}`);
  const evidence = await verifiedFile(root, asset.evidencePath, asset.evidenceSha256, `validation evidence ${asset.assetId}`);
  const parsed = JSON.parse(await readFile(asset.evidencePath, "utf8")) as Record<string, unknown>;
  if (parsed.assetId !== asset.assetId || parsed.state !== "validated" || parsed.sha256 !== asset.sha256) {
    throw new Error(`Validation evidence payload mismatch: ${asset.assetId}`);
  }
  return [image, evidence];
}

function metadata(target: EngineTarget): Record<string, unknown> {
  switch (target) {
    case "unity": return { pixelsPerUnit: 100, pivot: [0.5, 0], filterMode: "Point" };
    case "godot": return { region: true, pivot: [0.5, 0], filter: false };
    case "unreal": return { pixelsPerUnrealUnit: 1, pivot: [0.5, 0], compression: "UserInterface2D" };
    case "generic": return { frameRate: 24, pivot: [0.5, 0], coordinateSystem: "y-down" };
  }
}

async function writeNew(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), { flag: "wx" });
}

export async function packageValidatedRun(
  root: string,
  runId: string,
  continuityPointer: string,
  assets: ProducedAsset[],
  codeVersion: string,
  schemaVersion = "sprite-pipeline-v1",
): Promise<PackagedRun> {
  if (assets.length === 0) throw new Error("Cannot package an empty validated run");
  if (new Set(assets.map((asset) => asset.assetId)).size !== assets.length) throw new Error("Duplicate asset IDs in validated run");
  const files = (await Promise.all(assets.map((asset) => assetFiles(root, asset)))).flat();
  if (new Set(files.map((file) => file.path)).size !== files.length) throw new Error("Duplicate archive paths in validated run");
  const createdAt = new Date().toISOString();
  const archivePayload = {
    archiveId: `archive-${runId}`,
    runId,
    createdAt,
    codeVersion,
    schemaVersion,
    continuityPointer,
    files,
  };
  const archive: ArchiveManifest = { ...archivePayload, manifestSha256: sha256Canonical(archivePayload) };
  const archiveCheck = verifyArchiveManifest(archive);
  if (!archiveCheck.passed) throw new Error(`Archive integrity failed: ${archiveCheck.failures.join("; ")}`);
  const archivePath = join(root, "archives", runId, `${archive.manifestSha256}.manifest.json`);
  await writeNew(archivePath, archive);

  const packages: PackagedRun["packages"] = [];
  for (const target of ["unity", "godot", "unreal", "generic"] as const) {
    const payload = {
      packageId: `${target}-${runId}`,
      archiveId: archive.archiveId,
      target,
      createdAt,
      assetIds: assets.map((asset) => asset.assetId),
      files,
      metadata: { ...metadata(target), archiveManifest: basename(archivePath) },
    };
    const manifest: EnginePackage = { ...payload, packageSha256: sha256Canonical(payload) };
    const check = verifyEnginePackage(manifest);
    if (!check.passed) throw new Error(`${target} package integrity failed: ${check.failures.join("; ")}`);
    const path = join(root, "packages", runId, target, `${manifest.packageSha256}.package.json`);
    await writeNew(path, manifest);
    packages.push({ target, manifest, path });
  }
  return { archive, archivePath, packages };
}
