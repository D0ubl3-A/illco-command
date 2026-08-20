import { getGoldstrikeAnchor } from "@/lib/geospatial/goldstrike-canyon";
import {
  GOLDSTRIKE_SPRITES,
  type GoldstrikeSpriteCategory,
} from "@/lib/world/goldstrike-sprites";

export type GoldstrikeSpritePlacementStatus =
  | "EXACT_ANCHOR_COORDINATE"
  | "PENDING_GEOMETRY_PLACEMENT";

export type GoldstrikePlacementGeometrySource =
  | "EXISTING_GOLDSTRIKE_ANCHOR"
  | "NPS_PUBLIC_TRAILS_GEOGRAPHIC"
  | "ORTHOPHOTO_OR_FIELD_ALIGNMENT"
  | "HYDROGRAPHY_OR_ORTHOPHOTO_ALIGNMENT"
  | "SITE_ORTHOPHOTO_OR_SURVEY";

export interface GoldstrikeSpritePlacementRecord {
  sprite_id: string;
  category: GoldstrikeSpriteCategory;
  placement_status: GoldstrikeSpritePlacementStatus;
  anchor_id: string | null;
  latitude: number | null;
  longitude: number | null;
  utm_easting_m: number | null;
  utm_northing_m: number | null;
  local_east_m: number | null;
  local_north_m: number | null;
  elevation_m_navd88: number | null;
  horizontal_accuracy_m: number | null;
  evidence_status: string;
  geometry_source: GoldstrikePlacementGeometrySource;
  exact_coordinate_claim_allowed: boolean;
  notes: string;
}

export interface GoldstrikeSpritePlacementCoverage {
  totalSprites: number;
  exactAnchorCoordinateSprites: number;
  pendingGeometrySprites: number;
  exactCoveragePercent: number;
  complete: boolean;
}

function pendingGeometrySource(
  category: GoldstrikeSpriteCategory,
): GoldstrikePlacementGeometrySource {
  switch (category) {
    case "terrain_decal":
    case "traversal_obstacle":
      return "NPS_PUBLIC_TRAILS_GEOGRAPHIC";
    case "geothermal_water":
      return "ORTHOPHOTO_OR_FIELD_ALIGNMENT";
    case "river_shoreline":
      return "HYDROGRAPHY_OR_ORTHOPHOTO_ALIGNMENT";
    case "rock_formation":
    case "trailhead_environment":
    case "trailhead_prop":
      return "SITE_ORTHOPHOTO_OR_SURVEY";
    case "map_marker":
      return "SITE_ORTHOPHOTO_OR_SURVEY";
  }
}

export const GOLDSTRIKE_SPRITE_PLACEMENTS: readonly GoldstrikeSpritePlacementRecord[] =
  GOLDSTRIKE_SPRITES.map((sprite) => {
    if (sprite.anchor_id) {
      const anchor = getGoldstrikeAnchor(sprite.anchor_id);
      return {
        sprite_id: sprite.id,
        category: sprite.category,
        placement_status: "EXACT_ANCHOR_COORDINATE" as const,
        anchor_id: anchor.id,
        latitude: anchor.latitude,
        longitude: anchor.longitude,
        utm_easting_m: anchor.utm_easting_m,
        utm_northing_m: anchor.utm_northing_m,
        local_east_m: anchor.local_east_m,
        local_north_m: anchor.local_north_m,
        elevation_m_navd88: anchor.elevation_m_navd88,
        horizontal_accuracy_m: anchor.horizontal_accuracy_m,
        evidence_status: anchor.evidence_status,
        geometry_source: "EXISTING_GOLDSTRIKE_ANCHOR" as const,
        exact_coordinate_claim_allowed: true,
        notes:
          "Sprite resolves to an existing Goldstrike geographic anchor. Coordinate precision and evidence inherit the anchor record; the artwork itself is not survey geometry.",
      };
    }

    return {
      sprite_id: sprite.id,
      category: sprite.category,
      placement_status: "PENDING_GEOMETRY_PLACEMENT" as const,
      anchor_id: null,
      latitude: null,
      longitude: null,
      utm_easting_m: null,
      utm_northing_m: null,
      local_east_m: null,
      local_north_m: null,
      elevation_m_navd88: null,
      horizontal_accuracy_m: null,
      evidence_status: "UNKNOWN",
      geometry_source: pendingGeometrySource(sprite.category),
      exact_coordinate_claim_allowed: false,
      notes:
        "Reusable sprite asset only. Assign coordinates to a placed world instance after authoritative trail, orthophoto, hydrography, field, or survey geometry identifies the actual feature location.",
    };
  });

const placementIndex = new Map(
  GOLDSTRIKE_SPRITE_PLACEMENTS.map((placement) => [
    placement.sprite_id,
    placement,
  ]),
);

export function getGoldstrikeSpritePlacement(
  spriteId: string,
): Readonly<GoldstrikeSpritePlacementRecord> {
  const placement = placementIndex.get(spriteId);
  if (!placement) {
    throw new Error(`Unknown Goldstrike sprite placement: ${spriteId}`);
  }
  return placement;
}

export function listGoldstrikePendingSpritePlacements(): readonly GoldstrikeSpritePlacementRecord[] {
  return GOLDSTRIKE_SPRITE_PLACEMENTS.filter(
    (placement) => placement.placement_status === "PENDING_GEOMETRY_PLACEMENT",
  );
}

export function listGoldstrikeExactSpritePlacements(): readonly GoldstrikeSpritePlacementRecord[] {
  return GOLDSTRIKE_SPRITE_PLACEMENTS.filter(
    (placement) => placement.placement_status === "EXACT_ANCHOR_COORDINATE",
  );
}

export function getGoldstrikeSpritePlacementCoverage(): GoldstrikeSpritePlacementCoverage {
  const totalSprites = GOLDSTRIKE_SPRITE_PLACEMENTS.length;
  const exactAnchorCoordinateSprites =
    listGoldstrikeExactSpritePlacements().length;
  const pendingGeometrySprites = totalSprites - exactAnchorCoordinateSprites;

  return {
    totalSprites,
    exactAnchorCoordinateSprites,
    pendingGeometrySprites,
    exactCoveragePercent:
      totalSprites === 0
        ? 100
        : (exactAnchorCoordinateSprites / totalSprites) * 100,
    complete: pendingGeometrySprites === 0,
  };
}

export function validateGoldstrikeSpritePlacements(): {
  valid: boolean;
  issues: string[];
  coverage: GoldstrikeSpritePlacementCoverage;
} {
  const issues: string[] = [];
  const seenSpriteIds = new Set<string>();

  for (const placement of GOLDSTRIKE_SPRITE_PLACEMENTS) {
    if (seenSpriteIds.has(placement.sprite_id)) {
      issues.push(`Duplicate placement record: ${placement.sprite_id}`);
    }
    seenSpriteIds.add(placement.sprite_id);

    const hasAnyCoordinate =
      placement.latitude !== null ||
      placement.longitude !== null ||
      placement.utm_easting_m !== null ||
      placement.utm_northing_m !== null ||
      placement.local_east_m !== null ||
      placement.local_north_m !== null;

    if (placement.placement_status === "PENDING_GEOMETRY_PLACEMENT") {
      if (placement.anchor_id !== null) {
        issues.push(
          `${placement.sprite_id}: pending placement must not carry an anchor id`,
        );
      }
      if (hasAnyCoordinate || placement.exact_coordinate_claim_allowed) {
        issues.push(
          `${placement.sprite_id}: pending placement must not expose invented coordinates`,
        );
      }
    } else {
      if (
        placement.anchor_id === null ||
        placement.latitude === null ||
        placement.longitude === null ||
        !placement.exact_coordinate_claim_allowed
      ) {
        issues.push(
          `${placement.sprite_id}: exact placement is missing required anchor coordinates`,
        );
      }
    }
  }

  if (GOLDSTRIKE_SPRITE_PLACEMENTS.length !== GOLDSTRIKE_SPRITES.length) {
    issues.push("Placement registry does not cover every Goldstrike sprite");
  }

  return {
    valid: issues.length === 0,
    issues,
    coverage: getGoldstrikeSpritePlacementCoverage(),
  };
}
