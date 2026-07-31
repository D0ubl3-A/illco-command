import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { executeProductionRun } from "../lib/sprite-pipeline/production-run";
import type { RenderRequest } from "../lib/sprite-pipeline/procedural-renderer";

const phases = ["idle", "anticipation", "contact", "follow-through", "recovery", "victory"] as const;
const cameraAngles = ["front", "profile-left", "profile-right", "three-quarter-left", "three-quarter-right", "low-angle"] as const;

function color(seed: number, channel: number): number {
  return 48 + ((seed * (73 + channel * 29)) % 184);
}

function buildRequests(): RenderRequest[] {
  const requests: RenderRequest[] = [];

  for (let index = 1; index <= 24; index++) {
    requests.push({
      assetId: `character-${String(index).padStart(5, "0")}`,
      kind: "character",
      seed: 10_000 + index * 97,
      phase: phases[(index - 1) % phases.length],
      cameraAngle: cameraAngles[(index - 1) % cameraAngles.length],
      primary: [color(index, 0), color(index, 1), color(index, 2)],
      secondary: [color(index + 31, 2), color(index + 47, 0), color(index + 59, 1)],
    });
  }

  for (let index = 1; index <= 24; index++) {
    requests.push({
      assetId: `fx-${String(index).padStart(5, "0")}`,
      kind: "fx",
      seed: 20_000 + index * 131,
      phase: phases[(index + 1) % phases.length],
      cameraAngle: cameraAngles[(index + 2) % cameraAngles.length],
      primary: [color(index + 101, 0), color(index + 101, 1), color(index + 101, 2)],
      secondary: [color(index + 151, 2), color(index + 167, 0), color(index + 181, 1)],
    });
  }

  return requests;
}

async function main(): Promise<void> {
  const runId = process.env.SPRITE_RUN_ID?.trim() || `sprite-run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const outputRoot = resolve(process.env.SPRITE_OUTPUT_ROOT || "artifacts/sprite-production");
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const requests = buildRequests();
  const startedAt = new Date().toISOString();
  const result = await executeProductionRun(outputRoot, runId, requests);
  const completedAt = new Date().toISOString();

  const report = {
    theme: "original-claymation-celebrity-brawl-parody",
    startedAt,
    completedAt,
    requested: requests.length,
    characterRequested: requests.filter((request) => request.kind === "character").length,
    fxRequested: requests.filter((request) => request.kind === "fx").length,
    ...result,
    characterValidated: result.assets.filter((asset) => asset.kind === "character").length,
    fxValidated: result.assets.filter((asset) => asset.kind === "fx").length,
    exactAssetIds: result.assets.map((asset) => asset.assetId),
  };

  await writeFile(resolve(outputRoot, "run-report.json"), JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (result.generated !== 48 || result.validated !== 48 || result.rejected !== 0) {
    throw new Error(`Production truth gate failed: generated=${result.generated}, validated=${result.validated}, rejected=${result.rejected}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
