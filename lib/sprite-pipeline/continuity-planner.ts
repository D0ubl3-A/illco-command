import { createHash } from "node:crypto";

export type ContinuityAssetState =
  | "planned"
  | "queued"
  | "rendering"
  | "rendered_unvalidated"
  | "validated"
  | "packaged"
  | "published"
  | "retryable_failed"
  | "blocked"
  | "rejected_duplicate"
  | "rejected_quality"
  | "rejected_ip"
  | "rejected_policy"
  | "quarantined"
  | "retired"
  | "replaced";

export type ContinuityAsset = {
  assetId: string;
  kind: "character" | "fx";
  ordinal: number;
  ownerSurgeon: number;
  state: ContinuityAssetState;
  version: number;
  updatedAt: string;
};

export type ContinuityPlan = {
  firstUnvalidatedAssetId: string | null;
  firstBlockedRequiredAssetId: string | null;
  nextCharacterAssetId: string | null;
  nextFxAssetId: string | null;
  validatedCount: number;
  packagedCount: number;
  publishedCount: number;
  unresolvedRequiredCount: number;
  continuityPointer: string;
};

const TERMINAL_NONREQUIRED = new Set<ContinuityAssetState>(["retired", "replaced"]);
const VALIDATED_OR_LATER = new Set<ContinuityAssetState>(["validated", "packaged", "published"]);

function expectedOwner(kind: "character" | "fx", ordinal: number): number {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 10_000) {
    throw new RangeError(`Invalid ${kind} ordinal: ${ordinal}`);
  }
  return Math.floor((ordinal - 1) / 20) + (kind === "character" ? 1 : 501);
}

function canonicalAssetId(kind: "character" | "fx", ordinal: number): string {
  return `${kind}-${String(ordinal).padStart(5, "0")}`;
}

function assertAsset(asset: ContinuityAsset): void {
  if (asset.assetId !== canonicalAssetId(asset.kind, asset.ordinal)) {
    throw new Error(`Non-canonical asset ID: ${asset.assetId}`);
  }
  const owner = expectedOwner(asset.kind, asset.ordinal);
  if (asset.ownerSurgeon !== owner) {
    throw new Error(`Ownership violation for ${asset.assetId}: expected ${owner}, received ${asset.ownerSurgeon}`);
  }
  if (!Number.isInteger(asset.version) || asset.version < 1) {
    throw new Error(`Invalid version for ${asset.assetId}`);
  }
  if (Number.isNaN(Date.parse(asset.updatedAt))) {
    throw new Error(`Invalid updatedAt for ${asset.assetId}`);
  }
}

export function buildContinuityPlan(assets: readonly ContinuityAsset[]): ContinuityPlan {
  const byId = new Map<string, ContinuityAsset>();
  for (const asset of assets) {
    assertAsset(asset);
    if (byId.has(asset.assetId)) throw new Error(`Duplicate asset ID: ${asset.assetId}`);
    byId.set(asset.assetId, asset);
  }

  const requiredOrder: ContinuityAsset[] = [];
  for (const kind of ["character", "fx"] as const) {
    for (let ordinal = 1; ordinal <= 10_000; ordinal += 1) {
      const id = canonicalAssetId(kind, ordinal);
      const asset = byId.get(id);
      if (asset && !TERMINAL_NONREQUIRED.has(asset.state)) requiredOrder.push(asset);
      if (!asset) {
        requiredOrder.push({
          assetId: id,
          kind,
          ordinal,
          ownerSurgeon: expectedOwner(kind, ordinal),
          state: "planned",
          version: 1,
          updatedAt: "1970-01-01T00:00:00.000Z",
        });
      }
    }
  }

  const firstUnvalidated = requiredOrder.find((asset) => !VALIDATED_OR_LATER.has(asset.state)) ?? null;
  const firstBlocked = requiredOrder.find((asset) =>
    ["blocked", "rejected_ip", "rejected_policy", "quarantined"].includes(asset.state),
  ) ?? null;
  const nextCharacter = requiredOrder.find(
    (asset) => asset.kind === "character" && !VALIDATED_OR_LATER.has(asset.state),
  ) ?? null;
  const nextFx = requiredOrder.find(
    (asset) => asset.kind === "fx" && !VALIDATED_OR_LATER.has(asset.state),
  ) ?? null;

  const validatedCount = requiredOrder.filter((asset) => VALIDATED_OR_LATER.has(asset.state)).length;
  const packagedCount = requiredOrder.filter((asset) => asset.state === "packaged" || asset.state === "published").length;
  const publishedCount = requiredOrder.filter((asset) => asset.state === "published").length;
  const unresolvedRequiredCount = requiredOrder.length - validatedCount;

  const pointerPayload = {
    firstUnvalidatedAssetId: firstUnvalidated?.assetId ?? null,
    firstBlockedRequiredAssetId: firstBlocked?.assetId ?? null,
    nextCharacterAssetId: nextCharacter?.assetId ?? null,
    nextFxAssetId: nextFx?.assetId ?? null,
    validatedCount,
    packagedCount,
    publishedCount,
    unresolvedRequiredCount,
  };

  return {
    ...pointerPayload,
    continuityPointer: createHash("sha256").update(JSON.stringify(pointerPayload)).digest("hex"),
  };
}
