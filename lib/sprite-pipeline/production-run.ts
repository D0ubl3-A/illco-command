import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { decodePngPixels, measurePixelMetrics, type PixelMetrics } from "./png-pixels";
import { renderSprite, type RenderRequest } from "./procedural-renderer";

export type ProducedAsset = {
  assetId: string;
  kind: "character" | "fx";
  state: "validated";
  path: string;
  sha256: string;
  evidencePath: string;
  evidenceSha256: string;
  metrics: PixelMetrics;
  renderer: "illco-procedural-clay-v1";
};

export type ProductionRunResult = {
  runId: string;
  generated: number;
  renderedUnvalidated: number;
  validated: number;
  rejected: number;
  assets: ProducedAsset[];
  continuityPointer: string;
};

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

async function verifyExisting(path: string, bytes: Uint8Array): Promise<boolean> {
  try {
    const existing = await readFile(path);
    if (!equalBytes(existing, bytes)) throw new Error(`Immutable file collision: ${path}`);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function atomicWrite(path: string, bytes: Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (await verifyExisting(path, bytes)) return;

  const temp = `${path}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await writeFile(temp, bytes, { flag: "wx" });
  try {
    await copyFile(temp, path, constants.COPYFILE_EXCL);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    await verifyExisting(path, bytes);
  } finally {
    await unlink(temp).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

function validateRendered(kind: "character" | "fx", metrics: PixelMetrics): string[] {
  const failures: string[] = [];
  if (!metrics.alphaBoundsNonEmpty) failures.push("empty visible bounds");
  if (kind === "character") {
    if (metrics.chromaPurity < 0.55) failures.push(`chromaPurity=${metrics.chromaPurity}`);
    if (metrics.edgeContamination > 0) failures.push(`edgeContamination=${metrics.edgeContamination}`);
    if (metrics.chromaSpill > 0.03) failures.push(`chromaSpill=${metrics.chromaSpill}`);
  } else {
    if (metrics.clippingScore > 0) failures.push(`clippingScore=${metrics.clippingScore}`);
    if (metrics.transparentPixels === 0) failures.push("FX has no transparent pixels");
    if (metrics.alphaCoverage <= 0 || metrics.alphaCoverage >= 0.8) failures.push(`alphaCoverage=${metrics.alphaCoverage}`);
  }
  return failures;
}

function assertUniqueRequests(requests: RenderRequest[]): void {
  const seen = new Set<string>();
  for (const request of requests) {
    if (seen.has(request.assetId)) throw new Error(`Duplicate production asset ID: ${request.assetId}`);
    seen.add(request.assetId);
  }
}

export async function executeProductionRun(root: string, runId: string, requests: RenderRequest[]): Promise<ProductionRunResult> {
  if (!runId.trim()) throw new Error("runId is required");
  if (requests.length === 0) throw new Error("At least one render request is required");
  assertUniqueRequests(requests);
  const assets: ProducedAsset[] = [];
  let rejected = 0;

  for (const request of requests) {
    const rendered = renderSprite(request);
    const decoded = decodePngPixels(rendered.bytes);
    const metrics = measurePixelMetrics(decoded);
    const failures = validateRendered(rendered.kind, metrics);
    if (failures.length > 0) {
      rejected++;
      throw new Error(`Rendered asset ${request.assetId} failed validation: ${failures.join("; ")}`);
    }

    const objectPath = join(root, "objects", rendered.sha256.slice(0, 2), `${rendered.sha256}.png`);
    await atomicWrite(objectPath, rendered.bytes);
    const evidence = {
      runId,
      assetId: rendered.assetId,
      kind: rendered.kind,
      state: "validated",
      renderer: rendered.renderer,
      sha256: rendered.sha256,
      metrics,
      validatedAt: new Date().toISOString(),
    } as const;
    const evidenceBytes = Buffer.from(JSON.stringify(evidence, null, 2));
    const evidenceSha256 = createHash("sha256").update(evidenceBytes).digest("hex");
    const evidencePath = join(root, "evidence", runId, `${rendered.assetId}.${evidenceSha256}.json`);
    await atomicWrite(evidencePath, evidenceBytes);
    assets.push({
      assetId: rendered.assetId,
      kind: rendered.kind,
      state: "validated",
      path: objectPath,
      sha256: rendered.sha256,
      evidencePath,
      evidenceSha256,
      metrics,
      renderer: rendered.renderer,
    });
  }

  return {
    runId,
    generated: requests.length,
    renderedUnvalidated: 0,
    validated: assets.length,
    rejected,
    assets,
    continuityPointer: nextContinuityPointer(requests.map((request) => request.assetId)),
  };
}

function nextContinuityPointer(assetIds: string[]): string {
  const parsed = assetIds
    .map((id) => /^(character|fx)-(\d{5})$/.exec(id))
    .filter((match): match is RegExpExecArray => Boolean(match));
  if (parsed.length !== assetIds.length) return "unresolved";
  const characters = parsed.filter((match) => match[1] === "character").map((match) => Number(match[2]));
  const fx = parsed.filter((match) => match[1] === "fx").map((match) => Number(match[2]));
  if (characters.length > 0 && Math.max(...characters) < 10_000) return `character-${String(Math.max(...characters) + 1).padStart(5, "0")}`;
  if (fx.length > 0 && Math.max(...fx) < 10_000) return `fx-${String(Math.max(...fx) + 1).padStart(5, "0")}`;
  return "theme-complete";
}
