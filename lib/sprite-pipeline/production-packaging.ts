import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
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

export type PersistedPackageVerification = {
  passed: boolean;
  verifiedFiles: number;
  verifiedPackages: number;
  failures: string[];
};

function toArchivePath(root: string, path: string): string {
  const normalizedRoot = resolve(root);
  const normalizedPath = resolve(path);
  const rel = relative(normalizedRoot, normalizedPath).replaceAll("\\", "/");
  if (!rel || rel.startsWith("../") || rel.includes("/../")) throw new Error(`File escapes production root: ${path}`);
  return rel;
}

function fromArchivePath(root: string, path: string): string {
  if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").includes("..")) {
    throw new Error(`Unsafe archive path: ${path}`);
  }
  const absolute = resolve(root, path);
  const rel = relative(resolve(root), absolute).replaceAll("\\", "/");
  if (!rel || rel.startsWith("../") || rel.includes("/../")) throw new Error(`Archive path escapes production root: ${path}`);
  return absolute;
}

function persistedPathWithinRoot(root: string, path: string, label: string): string {
  const normalizedRoot = resolve(root);
  const normalizedPath = resolve(path);
  const rel = relative(normalizedRoot, normalizedPath).replaceAll("\\", "/");
  if (!rel || rel.startsWith("../") || rel.includes("/../")) {
    throw new Error(`${label} escapes production root: ${path}`);
  }
  return normalizedPath;
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
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const bytes = JSON.stringify(value, null, 2);
  try {
    await writeFile(temp, bytes, { flag: "wx" });
    await link(temp, path);
  } finally {
    await unlink(temp).catch(() => undefined);
  }
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

export async function verifyPackagedRunOnDisk(root: string, packaged: PackagedRun): Promise<PersistedPackageVerification> {
  const failures: string[] = [];
  let verifiedFiles = 0;
  let verifiedPackages = 0;

  let persistedArchive: ArchiveManifest | null = null;
  try {
    const archivePath = persistedPathWithinRoot(root, packaged.archivePath, "archive manifest path");
    persistedArchive = JSON.parse(await readFile(archivePath, "utf8")) as ArchiveManifest;
    const archiveCheck = verifyArchiveManifest(persistedArchive);
    if (!archiveCheck.passed) failures.push(...archiveCheck.failures.map((failure) => `archive: ${failure}`));
    if (persistedArchive.manifestSha256 !== packaged.archive.manifestSha256) failures.push("archive manifest identity mismatch");
  } catch (error) {
    failures.push(`archive read failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (persistedArchive) {
    for (const file of persistedArchive.files) {
      try {
        const absolute = fromArchivePath(root, file.path);
        const info = await stat(absolute);
        if (!info.isFile() || info.size !== file.bytes) throw new Error(`byte-size mismatch for ${file.path}`);
        const digest = createHash("sha256").update(await readFile(absolute)).digest("hex");
        if (digest !== file.sha256) throw new Error(`hash mismatch for ${file.path}`);
        verifiedFiles++;
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  const expectedTargets: EngineTarget[] = ["unity", "godot", "unreal", "generic"];
  const seenTargets = new Set<EngineTarget>();
  for (const entry of packaged.packages) {
    if (seenTargets.has(entry.target)) {
      failures.push(`duplicate engine package target: ${entry.target}`);
      continue;
    }
    seenTargets.add(entry.target);
    try {
      const packagePath = persistedPathWithinRoot(root, entry.path, `${entry.target} package path`);
      const persisted = JSON.parse(await readFile(packagePath, "utf8")) as EnginePackage;
      const check = verifyEnginePackage(persisted);
      if (!check.passed) throw new Error(check.failures.join("; "));
      if (persisted.packageSha256 !== entry.manifest.packageSha256) throw new Error("package identity mismatch");
      if (persisted.archiveId !== packaged.archive.archiveId) throw new Error("archive linkage mismatch");
      if (persisted.target !== entry.target) throw new Error("engine target mismatch");
      if (persisted.files.length !== packaged.archive.files.length) throw new Error("package file-count mismatch");
      if (sha256Canonical(persisted.files) !== sha256Canonical(packaged.archive.files)) throw new Error("package file-set mismatch");
      if (sha256Canonical(persisted.assetIds) !== sha256Canonical(entry.manifest.assetIds)) throw new Error("package asset identity mismatch");
      verifiedPackages++;
    } catch (error) {
      failures.push(`${entry.target} package verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const target of expectedTargets) if (!seenTargets.has(target)) failures.push(`missing engine package target: ${target}`);

  return { passed: failures.length === 0, verifiedFiles, verifiedPackages, failures };
}
