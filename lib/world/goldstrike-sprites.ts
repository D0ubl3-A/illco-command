import {
  GOLDSTRIKE_ANCHORS,
  getGoldstrikeAnchor,
} from "@/lib/geospatial/goldstrike-canyon";
import {
  GOLDSTRIKE_RAW_SPRITES,
  type GoldstrikeSpriteCategory,
} from "@/lib/world/goldstrike-sprite-frames";

export type { GoldstrikeSpriteCategory };

export interface GoldstrikeSpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GoldstrikeSpriteDefinition {
  id: string;
  category: GoldstrikeSpriteCategory;
  frame: GoldstrikeSpriteFrame;
  pivot_normalized: { x: number; y: number };
  anchor_id: string | null;
  collision_policy: "none" | "authored_proxy";
  generation_status: "SPRITE_READY";
}

export interface GoldstrikeSpriteUvRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export interface GoldstrikeSpriteValidationIssue {
  spriteId: string;
  field: string;
  message: string;
}

export interface GoldstrikeSpriteValidationReport {
  valid: boolean;
  checkedSprites: number;
  issues: GoldstrikeSpriteValidationIssue[];
}

export const GOLDSTRIKE_SPRITE_SHEET = Object.freeze({
  id: "goldstrike_all_far_lod",
  file: "/world/goldstrike-canyon/sprites/sheets/goldstrike_all_far_lod.webp",
  width: 64,
  height: 84,
  sha256: "2ea4e18b36a96710a385e12d01261a1dfcfb3f71d2ea45d02dc2f022227796a3",
  gitBlobSha1: "93fa6f13c12c7ed3d9d0590ce8f3ffc422820c2c",
  frameCount: 84,
  format: "webp",
  lod: "far_streaming",
  sourceMasterSheetCount: 8,
  sourceMasterWidth: 1536,
  sourceMasterHeight: 1024,
} as const);

const collisionCategories = new Set<GoldstrikeSpriteCategory>([
  "rock_formation",
  "trailhead_environment",
  "trailhead_prop",
  "traversal_obstacle",
]);

export const GOLDSTRIKE_SPRITES: readonly GoldstrikeSpriteDefinition[] =
  GOLDSTRIKE_RAW_SPRITES.map(
    ([id, category, x, y, w, h, pivotY, anchorId]) => ({
      id,
      category,
      frame: { x, y, w, h },
      pivot_normalized: { x: 0.5, y: pivotY },
      anchor_id: anchorId,
      collision_policy: collisionCategories.has(category)
        ? "authored_proxy"
        : "none",
      generation_status: "SPRITE_READY",
    }),
  );

const spriteIndex = new Map(
  GOLDSTRIKE_SPRITES.map((sprite) => [sprite.id, sprite]),
);
const knownAnchorIds = new Set(
  GOLDSTRIKE_ANCHORS.map((anchor) => anchor.id),
);

export function getGoldstrikeSprite(
  spriteId: string,
): Readonly<GoldstrikeSpriteDefinition> {
  const sprite = spriteIndex.get(spriteId);
  if (!sprite) {
    throw new Error(`Unknown Goldstrike sprite: ${spriteId}`);
  }
  return sprite;
}

export function listGoldstrikeSpritesByCategory(
  category: GoldstrikeSpriteCategory,
): readonly GoldstrikeSpriteDefinition[] {
  return GOLDSTRIKE_SPRITES.filter(
    (sprite) => sprite.category === category,
  );
}

export function listGoldstrikeSpritesForAnchor(
  anchorId: string,
): readonly GoldstrikeSpriteDefinition[] {
  getGoldstrikeAnchor(anchorId);
  return GOLDSTRIKE_SPRITES.filter(
    (sprite) => sprite.anchor_id === anchorId,
  );
}

export function getGoldstrikeSpriteUvRect(
  spriteId: string,
): GoldstrikeSpriteUvRect {
  const { frame } = getGoldstrikeSprite(spriteId);
  return {
    u0: frame.x / GOLDSTRIKE_SPRITE_SHEET.width,
    v0: frame.y / GOLDSTRIKE_SPRITE_SHEET.height,
    u1: (frame.x + frame.w) / GOLDSTRIKE_SPRITE_SHEET.width,
    v1: (frame.y + frame.h) / GOLDSTRIKE_SPRITE_SHEET.height,
  };
}

export function getGoldstrikeSpriteCssStyle(
  spriteId: string,
  scale = 1,
): Readonly<Record<string, string>> {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError(
      `Goldstrike sprite scale must be positive; received ${scale}`,
    );
  }

  const sprite = getGoldstrikeSprite(spriteId);
  const { x, y, w, h } = sprite.frame;
  return {
    width: `${w * scale}px`,
    height: `${h * scale}px`,
    backgroundImage: `url(${GOLDSTRIKE_SPRITE_SHEET.file})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: `${-x * scale}px ${-y * scale}px`,
    backgroundSize: `${GOLDSTRIKE_SPRITE_SHEET.width * scale}px ${
      GOLDSTRIKE_SPRITE_SHEET.height * scale
    }px`,
    transformOrigin: `${sprite.pivot_normalized.x * 100}% ${
      sprite.pivot_normalized.y * 100
    }%`,
  };
}

export function validateGoldstrikeSpriteAtlas(): GoldstrikeSpriteValidationReport {
  const issues: GoldstrikeSpriteValidationIssue[] = [];
  const seen = new Set<string>();

  for (const sprite of GOLDSTRIKE_SPRITES) {
    if (seen.has(sprite.id)) {
      issues.push({
        spriteId: sprite.id,
        field: "id",
        message: "Duplicate sprite id",
      });
    }
    seen.add(sprite.id);

    const { x, y, w, h } = sprite.frame;
    if (x < 0 || y < 0 || w <= 0 || h <= 0) {
      issues.push({
        spriteId: sprite.id,
        field: "frame",
        message: "Frame values must be non-negative with positive size",
      });
    }
    if (
      x + w > GOLDSTRIKE_SPRITE_SHEET.width ||
      y + h > GOLDSTRIKE_SPRITE_SHEET.height
    ) {
      issues.push({
        spriteId: sprite.id,
        field: "frame",
        message: "Frame exceeds atlas bounds",
      });
    }
    if (
      sprite.pivot_normalized.x < 0 ||
      sprite.pivot_normalized.x > 1 ||
      sprite.pivot_normalized.y < 0 ||
      sprite.pivot_normalized.y > 1
    ) {
      issues.push({
        spriteId: sprite.id,
        field: "pivot_normalized",
        message: "Pivot must remain within 0..1",
      });
    }
    if (sprite.anchor_id && !knownAnchorIds.has(sprite.anchor_id)) {
      issues.push({
        spriteId: sprite.id,
        field: "anchor_id",
        message: `Unknown Goldstrike anchor: ${sprite.anchor_id}`,
      });
    }
  }

  if (GOLDSTRIKE_SPRITES.length !== GOLDSTRIKE_SPRITE_SHEET.frameCount) {
    issues.push({
      spriteId: GOLDSTRIKE_SPRITE_SHEET.id,
      field: "frameCount",
      message: "Atlas frame count does not match indexed sprites",
    });
  }

  return {
    valid: issues.length === 0,
    checkedSprites: GOLDSTRIKE_SPRITES.length,
    issues,
  };
}
