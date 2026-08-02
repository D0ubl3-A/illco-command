import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { executeProductionRun } from "../lib/sprite-pipeline/production-run";
import { packageValidatedRun, verifyPackagedRunOnDisk } from "../lib/sprite-pipeline/production-packaging";
import type { RenderRequest } from "../lib/sprite-pipeline/procedural-renderer";

type Options = {
  root: string;
  runId: string;
  characters: number;
  fx: number;
  characterStart: number;
  fxStart: number;
};

function readValue(args: string[], key: string): string | undefined {
  const index = args.indexOf(key);
  return index >= 0 ? args[index + 1] : undefined;
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

export function parseSpriteSkillOptions(args: string[]): Options {
  const root = resolve(readValue(args, "--root") ?? ".sprite-production");
  const runId = (readValue(args, "--run-id") ?? `clay-brawl-${new Date().toISOString().replace(/[:.]/g, "-")}`).trim();
  if (!runId || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(runId)) {
    throw new Error("run-id must be 1-128 safe filename characters");
  }
  const characters = positiveInteger(readValue(args, "--characters"), 24, "characters");
  const fx = positiveInteger(readValue(args, "--fx"), 24, "fx");
  const characterStart = positiveInteger(readValue(args, "--character-start"), 1, "character-start");
  const fxStart = positiveInteger(readValue(args, "--fx-start"), 1, "fx-start");
  if (characterStart + characters - 1 > 10_000) throw new Error("character range exceeds character-10000");
  if (fxStart + fx - 1 > 10_000) throw new Error("FX range exceeds fx-10000");
  return { root, runId, characters, fx, characterStart, fxStart };
}

function color(seed: number, offset: number): [number, number, number] {
  const r = 40 + ((seed * 47 + offset * 17) % 190);
  const g = 25 + ((seed * 31 + offset * 29) % 150);
  const b = 35 + ((seed * 61 + offset * 13) % 190);
  return [r, g, b];
}

export function buildSpriteSkillRequests(options: Options): RenderRequest[] {
  const phases = ["idle", "anticipation", "contact", "follow-through", "recovery"];
  const angles = ["front", "profile-left", "three-quarter-left", "three-quarter-right", "low-angle", "high-angle"];
  const requests: RenderRequest[] = [];
  for (let index = 0; index < options.characters; index++) {
    const numericId = options.characterStart + index;
    requests.push({
      assetId: `character-${String(numericId).padStart(5, "0")}`,
      kind: "character",
      seed: numericId * 1009 + 17,
      phase: phases[index % phases.length],
      cameraAngle: angles[index % angles.length],
      primary: color(numericId, 1),
      secondary: color(numericId, 2),
    });
  }
  for (let index = 0; index < options.fx; index++) {
    const numericId = options.fxStart + index;
    requests.push({
      assetId: `fx-${String(numericId).padStart(5, "0")}`,
      kind: "fx",
      seed: numericId * 2017 + 31,
      phase: phases[index % phases.length],
      cameraAngle: angles[index % angles.length],
      primary: color(numericId, 3),
      secondary: color(numericId, 4),
    });
  }
  return requests;
}

export async function runSpriteSkill(args: string[]): Promise<Record<string, unknown>> {
  const options = parseSpriteSkillOptions(args);
  const requests = buildSpriteSkillRequests(options);
  const result = await executeProductionRun(options.root, options.runId, requests);
  const characterCount = result.assets.filter((asset) => asset.kind === "character").length;
  const fxCount = result.assets.filter((asset) => asset.kind === "fx").length;
  if (result.generated !== requests.length || result.validated !== requests.length || result.rejected !== 0) {
    throw new Error(`Truth-count mismatch requested=${requests.length} generated=${result.generated} validated=${result.validated} rejected=${result.rejected}`);
  }
  if (characterCount !== options.characters || fxCount !== options.fx) {
    throw new Error(`Kind-count mismatch characters=${characterCount}/${options.characters} fx=${fxCount}/${options.fx}`);
  }
  const packaged = await packageValidatedRun(
    options.root,
    options.runId,
    result.continuityPointer,
    result.assets,
    process.env.GITHUB_SHA ?? "local-unversioned",
  );
  const packageVerification = await verifyPackagedRunOnDisk(options.root, packaged);
  const expectedVerifiedFiles = result.assets.length * 2;
  if (!packageVerification.passed) {
    throw new Error(`Persisted package verification failed: ${packageVerification.failures.join("; ")}`);
  }
  if (packageVerification.verifiedFiles !== expectedVerifiedFiles || packageVerification.verifiedPackages !== 4) {
    throw new Error(
      `Persisted package count mismatch files=${packageVerification.verifiedFiles}/${expectedVerifiedFiles} packages=${packageVerification.verifiedPackages}/4`,
    );
  }
  const summary = {
    skill: "sprite-pipeline-to-10k",
    skillVersion: "1.2.0",
    runId: result.runId,
    requested: requests.length,
    generated: result.generated,
    renderedUnvalidated: result.renderedUnvalidated,
    validated: result.validated,
    rejected: result.rejected,
    characters: characterCount,
    fx: fxCount,
    archived: packageVerification.verifiedFiles,
    packaged: result.assets.length,
    packageVerification,
    packageTargets: packaged.packages.map((entry) => entry.target),
    archiveId: packaged.archive.archiveId,
    archiveManifestSha256: packaged.archive.manifestSha256,
    archivePath: packaged.archivePath,
    packages: packaged.packages.map((entry) => ({
      target: entry.target,
      packageId: entry.manifest.packageId,
      packageSha256: entry.manifest.packageSha256,
      path: entry.path,
    })),
    continuityPointer: result.continuityPointer,
    assets: result.assets,
    completedAt: new Date().toISOString(),
  };
  const summaryPath = join(options.root, "runs", options.runId, "summary.json");
  await mkdir(resolve(summaryPath, ".."), { recursive: true });
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), { flag: "wx" });
  return { ...summary, summaryPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSpriteSkill(process.argv.slice(2))
    .then((summary) => process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`sprite-pipeline-to-10k failed: ${message}\n`);
      process.exitCode = 1;
    });
}
