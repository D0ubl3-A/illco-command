import { getGoldstrikeAnchor } from "@/lib/geospatial/goldstrike-canyon";
import {
  getGoldstrikeRouteReferenceWaypoint,
} from "@/lib/world/goldstrike-route-reference-waypoints";
import {
  GOLDSTRIKE_SPRITES,
  type GoldstrikeSpriteCategory,
} from "@/lib/world/goldstrike-sprites";

export type GoldstrikeSpritePlacementStatus =
  | "EXACT_ANCHOR_COORDINATE"
  | "PUBLISHED_FEATURE_REFERENCE"
  | "PENDING_GEOMETRY_PLACEMENT";

export type GoldstrikePlacementGeometrySource =
  | "EXISTING_GOLDSTRIKE_ANCHOR"
  | "PUBLISHED_ROUTE_WAYPOINT"
  | "NPS_PUBLIC_TRAILS_GEOGRAPHIC"
  | "ORTHOPHOTO_OR_FIELD_ALIGNMENT"
  | "HYDROGRAPHY_OR_ORTHOPHOTO_ALIGNMENT"
  | "SITE_ORTHOPHOTO_OR_SURVEY";

export type GoldstrikeReferenceMatchStatus =
  | "ANCHOR_IDENTITY_MATCH"
  | "DIRECT_FEATURE_MATCH"
  | "FEATURE_AREA_PROXY"
  | null;

export interface GoldstrikeSpritePlacementRecord {
  sprite_id: string;
  category: GoldstrikeSpriteCategory;
  placement_status: GoldstrikeSpritePlacementStatus;
  anchor_id: string | null;
  reference_id: string | null;
  reference_match_status: GoldstrikeReferenceMatchStatus;
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
  publishedFeatureReferenceSprites: number;
  coordinateAssociatedSprites: number;
  pendingGeometrySprites: number;
  exactCoveragePercent: number;
  coordinateCoveragePercent: number;
  complete: boolean;
}

interface PublishedReferenceMatch {
  waypointId: string;
  matchStatus: Exclude<
    GoldstrikeReferenceMatchStatus,
    "ANCHOR_IDENTITY_MATCH" | null
  >;
  notes: string;
}

const publishedReferenceMatches: Readonly<
  Partial<Record<string, PublishedReferenceMatch>>
> = Object.freeze({
  gs_natural_stone_steps: {
    waypointId: "GS-WP-STAIR",
    matchStatus: "DIRECT_FEATURE_MATCH",
    notes:
      "Published WGS84 waypoint describes a rope-assisted rocky obstacle with cut steps. The sprite is a direct game-art representation of that identified feature.",
  },
  gs_dryfall_rock_scramble: {
    waypointId: "GS-WP-STAIR",
    matchStatus: "FEATURE_AREA_PROXY",
    notes:
      "Published stair/rope waypoint identifies this technical obstacle area. The dryfall artwork is an area proxy, not survey geometry.",
  },
  gs_handline_traverse: {
    waypointId: "GS-WP-STAIR",
    matchStatus: "FEATURE_AREA_PROXY",
    notes:
      "The source identifies a rope-assisted obstacle at this waypoint. The handline sprite is an area proxy and the rope itself is not treated as maintained or permanent.",
  },
  gs_fixed_rope_ledge: {
    waypointId: "GS-WP-STAIR",
    matchStatus: "FEATURE_AREA_PROXY",
    notes:
      "The source identifies a rope-assisted obstacle at this waypoint. This sprite is a visual proxy only; rope placement and condition are not asserted as current.",
  },
  gs_large_boulder_cluster: {
    waypointId: "GS-WP-UPANDOVER",
    matchStatus: "FEATURE_AREA_PROXY",
    notes:
      "Published waypoint identifies a boulder-debris area requiring an up-and-over bypass. The sprite represents that area without claiming individual-boulder survey fidelity.",
  },
  gs_low_boulder_obstacle: {
    waypointId: "GS-WP-UPANDOVER",
    matchStatus: "FEATURE_AREA_PROXY",
    notes:
      "Published waypoint identifies a boulder-debris obstacle. The sprite is placed as a game-art proxy for the obstacle area.",
  },
  gs_steep_rock_scramble: {
    waypointId: "GS-WP-UPANDOVER",
    matchStatus: "FEATURE_AREA_PROXY",
    notes:
      "Published waypoint identifies an obstacle where travel leaves the wash and bypasses boulders. The scramble sprite represents the same feature area.",
  },
  gs_soaking_pool_large: {
    waypointId: "GS-WP-HOTSPRINGS",
    matchStatus: "FEATURE_AREA_PROXY",
    notes:
      "Published WGS84 waypoint identifies Gold Strike Hot Springs. It does not define a particular pool centroid or boundary, so this pool sprite is an area proxy.",
  },
  gs_gold_strike_hot_springs_marker: {
    waypointId: "GS-WP-HOTSPRINGS",
    matchStatus: "DIRECT_FEATURE_MATCH",
    notes:
      "Marker now points to a published Gold Strike Hot Springs waypoint instead of inheriting the generic canyon reference. Source accuracy is not quantified, so this remains a feature-reference coordinate rather than a survey-exact claim.",
  },
  gs_calm_river_edge: {
    waypointId: "GS-WP-RIVER",
    matchStatus: "FEATURE_AREA_PROXY",
    notes:
      "Published WGS84 route endpoint identifies the Colorado River end of the Goldstrike hike. The shoreline sprite is an area proxy, not an exact bank-segment survey.",
  },
});

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
    const publishedMatch = publishedReferenceMatches[sprite.id];
    if (publishedMatch) {
      const reference = getGoldstrikeRouteReferenceWaypoint(
        publishedMatch.waypointId,
      );
      return {
        sprite_id: sprite.id,
        category: sprite.category,
        placement_status: "PUBLISHED_FEATURE_REFERENCE" as const,
        anchor_id: null,
        reference_id: reference.id,
        reference_match_status: publishedMatch.matchStatus,
        latitude: reference.latitude,
        longitude: reference.longitude,
        utm_easting_m: reference.utm_easting_m,
        utm_northing_m: reference.utm_northing_m,
        local_east_m: reference.local_east_m,
        local_north_m: reference.local_north_m,
        elevation_m_navd88: null,
        horizontal_accuracy_m: reference.horizontal_accuracy_m,
        evidence_status: reference.evidence_status,
        geometry_source: "PUBLISHED_ROUTE_WAYPOINT" as const,
        exact_coordinate_claim_allowed: false,
        notes: publishedMatch.notes,
      };
    }

    if (sprite.anchor_id) {
      const anchor = getGoldstrikeAnchor(sprite.anchor_id);
      return {
        sprite_id: sprite.id,
        category: sprite.category,
        placement_status: "EXACT_ANCHOR_COORDINATE" as const,
        anchor_id: anchor.id,
        reference_id: null,
        reference_match_status: "ANCHOR_IDENTITY_MATCH" as const,
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
      reference_id: null,
      reference_match_status: null,
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

export function listGoldstrikePublishedReferencePlacements(): readonly GoldstrikeSpritePlacementRecord[] {
  return GOLDSTRIKE_SPRITE_PLACEMENTS.filter(
    (placement) => placement.placement_status === "PUBLISHED_FEATURE_REFERENCE",
  );
}

export function listGoldstrikeCoordinateAssociatedPlacements(): readonly GoldstrikeSpritePlacementRecord[] {
  return GOLDSTRIKE_SPRITE_PLACEMENTS.filter(
    (placement) => placement.latitude !== null && placement.longitude !== null,
  );
}

export function getGoldstrikeSpritePlacementCoverage(): GoldstrikeSpritePlacementCoverage {
  const totalSprites = GOLDSTRIKE_SPRITE_PLACEMENTS.length;
  const exactAnchorCoordinateSprites =
    listGoldstrikeExactSpritePlacements().length;
  const publishedFeatureReferenceSprites =
    listGoldstrikePublishedReferencePlacements().length;
  const coordinateAssociatedSprites =
    exactAnchorCoordinateSprites + publishedFeatureReferenceSprites;
  const pendingGeometrySprites = totalSprites - coordinateAssociatedSprites;

  return {
    totalSprites,
    exactAnchorCoordinateSprites,
    publishedFeatureReferenceSprites,
    coordinateAssociatedSprites,
    pendingGeometrySprites,
    exactCoveragePercent:
      totalSprites === 0
        ? 100
        : (exactAnchorCoordinateSprites / totalSprites) * 100,
    coordinateCoveragePercent:
      totalSprites === 0 ? 100 : (coordinateAssociatedSprites / totalSprites) * 100,
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
      if (placement.anchor_id !== null || placement.reference_id !== null) {
        issues.push(
          `${placement.sprite_id}: pending placement must not carry anchor/reference ids`,
        );
      }
      if (
        hasAnyCoordinate ||
        placement.exact_coordinate_claim_allowed ||
        placement.reference_match_status !== null
      ) {
        issues.push(
          `${placement.sprite_id}: pending placement must not expose invented coordinates`,
        );
      }
      continue;
    }

    if (placement.placement_status === "EXACT_ANCHOR_COORDINATE") {
      if (
        placement.anchor_id === null ||
        placement.reference_id !== null ||
        placement.latitude === null ||
        placement.longitude === null ||
        !placement.exact_coordinate_claim_allowed ||
        placement.reference_match_status !== "ANCHOR_IDENTITY_MATCH"
      ) {
        issues.push(
          `${placement.sprite_id}: exact placement is missing required anchor coordinates`,
        );
      }
      continue;
    }

    if (
      placement.anchor_id !== null ||
      placement.reference_id === null ||
      placement.latitude === null ||
      placement.longitude === null ||
      placement.exact_coordinate_claim_allowed ||
      placement.geometry_source !== "PUBLISHED_ROUTE_WAYPOINT" ||
      placement.reference_match_status === null ||
      placement.reference_match_status === "ANCHOR_IDENTITY_MATCH"
    ) {
      issues.push(
        `${placement.sprite_id}: published feature reference is not correctly qualified`,
      );
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
