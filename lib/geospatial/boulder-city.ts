import manifestJson from "@/data/world/boulder-city/anchors.json";
import { wgs84ToUtm } from "@/lib/geospatial/wgs84-utm";

export type BoulderCityEvidenceStatus =
  | "UNKNOWN"
  | "ESTIMATED"
  | "USER_REPORTED"
  | "SOURCE_CONFIRMED_SECONDARY"
  | "SOURCE_CONFIRMED_OFFICIAL"
  | "VISUALLY_CONFIRMED"
  | "MANUALLY_APPROVED";

export interface BoulderCityAnchor {
  id: string;
  name: string;
  label: string;
  type: string;
  address: string | null;
  latitude: number;
  longitude: number;
  utm_zone: number;
  hemisphere: "N" | "S";
  utm_easting_m: number;
  utm_northing_m: number;
  local_east_m: number;
  local_north_m: number;
  elevation_m_navd88: number | null;
  horizontal_accuracy_m: number;
  evidence_status: BoulderCityEvidenceStatus;
  source_ids: string[];
  generation_status: string;
}

export interface BoulderCityManifest {
  schema_version: string;
  region_id: "boulder_city";
  display_name: string;
  generated_at: string;
  horizontal_input_crs: "EPSG:4326";
  production_crs: "EPSG:32611";
  vertical_crs: "NAVD88";
  vertical_values_status: string;
  units: "meters";
  origin_anchor_id: string;
  linked_regions: string[];
  anchors: BoulderCityAnchor[];
}

export interface BoulderCityLocalEnuCoordinate {
  eastM: number;
  northM: number;
  upM: number | null;
}

export interface BoulderCityAnchorValidationIssue {
  anchorId: string;
  field: string;
  expected: number | string;
  actual: number | string;
  difference?: number;
}

export interface BoulderCityAnchorValidationReport {
  valid: boolean;
  checkedAnchors: number;
  maximumProjectionErrorM: number;
  maximumLocalOffsetErrorM: number;
  issues: BoulderCityAnchorValidationIssue[];
}

const manifest = manifestJson as BoulderCityManifest;
const anchorIndex = new Map(manifest.anchors.map((anchor) => [anchor.id, anchor]));

function requireAnchor(anchorId: string): BoulderCityAnchor {
  const anchor = anchorIndex.get(anchorId);
  if (!anchor) {
    throw new Error(`Unknown Boulder City anchor: ${anchorId}`);
  }
  return anchor;
}

export const BOULDER_CITY_MANIFEST: Readonly<BoulderCityManifest> = manifest;
export const BOULDER_CITY_ANCHORS: readonly BoulderCityAnchor[] = manifest.anchors;
export const BOULDER_CITY_ORIGIN: Readonly<BoulderCityAnchor> = requireAnchor(
  manifest.origin_anchor_id,
);

export function getBoulderCityAnchor(
  anchorId: string,
): Readonly<BoulderCityAnchor> {
  return requireAnchor(anchorId);
}

export function wgs84ToBoulderCityLocal(
  latitude: number,
  longitude: number,
  elevationMNavd88: number | null = null,
): BoulderCityLocalEnuCoordinate {
  const projected = wgs84ToUtm(latitude, longitude, 11);

  return {
    eastM: projected.eastingM - BOULDER_CITY_ORIGIN.utm_easting_m,
    northM: projected.northingM - BOULDER_CITY_ORIGIN.utm_northing_m,
    upM: elevationMNavd88,
  };
}

export function boulderCityAnchorToUnityPosition(
  anchorId: string,
  fallbackUpM = 0,
): Readonly<{ x: number; y: number; z: number }> {
  const anchor = requireAnchor(anchorId);
  return {
    x: anchor.local_east_m,
    y: anchor.elevation_m_navd88 ?? fallbackUpM,
    z: anchor.local_north_m,
  };
}

export function boulderCityAnchorToUnrealPositionCm(
  anchorId: string,
  fallbackUpM = 0,
): Readonly<{ x: number; y: number; z: number }> {
  const anchor = requireAnchor(anchorId);
  return {
    x: anchor.local_east_m * 100,
    y: anchor.local_north_m * 100,
    z: (anchor.elevation_m_navd88 ?? fallbackUpM) * 100,
  };
}

export function validateBoulderCityManifest(
  projectionToleranceM = 0.02,
  localOffsetToleranceM = 0.02,
): BoulderCityAnchorValidationReport {
  const issues: BoulderCityAnchorValidationIssue[] = [];
  let maximumProjectionErrorM = 0;
  let maximumLocalOffsetErrorM = 0;

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  for (const anchor of manifest.anchors) {
    if (seenIds.has(anchor.id)) {
      issues.push({
        anchorId: anchor.id,
        field: "id",
        expected: "unique",
        actual: "duplicate",
      });
    }
    seenIds.add(anchor.id);

    if (seenNames.has(anchor.name)) {
      issues.push({
        anchorId: anchor.id,
        field: "name",
        expected: "unique",
        actual: "duplicate",
      });
    }
    seenNames.add(anchor.name);

    const projected = wgs84ToUtm(anchor.latitude, anchor.longitude, anchor.utm_zone);
    const projectionErrorM = Math.hypot(
      projected.eastingM - anchor.utm_easting_m,
      projected.northingM - anchor.utm_northing_m,
    );
    maximumProjectionErrorM = Math.max(maximumProjectionErrorM, projectionErrorM);

    if (projected.hemisphere !== anchor.hemisphere) {
      issues.push({
        anchorId: anchor.id,
        field: "hemisphere",
        expected: projected.hemisphere,
        actual: anchor.hemisphere,
      });
    }

    if (projectionErrorM > projectionToleranceM) {
      issues.push({
        anchorId: anchor.id,
        field: "utm_projection",
        expected: `${projected.eastingM},${projected.northingM}`,
        actual: `${anchor.utm_easting_m},${anchor.utm_northing_m}`,
        difference: projectionErrorM,
      });
    }

    const expectedLocalEastM = projected.eastingM - BOULDER_CITY_ORIGIN.utm_easting_m;
    const expectedLocalNorthM =
      projected.northingM - BOULDER_CITY_ORIGIN.utm_northing_m;
    const localOffsetErrorM = Math.hypot(
      expectedLocalEastM - anchor.local_east_m,
      expectedLocalNorthM - anchor.local_north_m,
    );
    maximumLocalOffsetErrorM = Math.max(
      maximumLocalOffsetErrorM,
      localOffsetErrorM,
    );

    if (localOffsetErrorM > localOffsetToleranceM) {
      issues.push({
        anchorId: anchor.id,
        field: "local_offset",
        expected: `${expectedLocalEastM},${expectedLocalNorthM}`,
        actual: `${anchor.local_east_m},${anchor.local_north_m}`,
        difference: localOffsetErrorM,
      });
    }

    if (anchor.utm_zone !== 11) {
      issues.push({
        anchorId: anchor.id,
        field: "utm_zone",
        expected: 11,
        actual: anchor.utm_zone,
      });
    }

    if (
      !Number.isFinite(anchor.horizontal_accuracy_m) ||
      anchor.horizontal_accuracy_m <= 0
    ) {
      issues.push({
        anchorId: anchor.id,
        field: "horizontal_accuracy_m",
        expected: "finite positive number",
        actual: String(anchor.horizontal_accuracy_m),
      });
    }

    if (anchor.source_ids.length === 0) {
      issues.push({
        anchorId: anchor.id,
        field: "source_ids",
        expected: "at least one source",
        actual: "empty",
      });
    }

    if (anchor.type === "runway_threshold" && anchor.horizontal_accuracy_m > 1) {
      issues.push({
        anchorId: anchor.id,
        field: "horizontal_accuracy_m",
        expected: "<= 1 for runway thresholds",
        actual: anchor.horizontal_accuracy_m,
      });
    }
  }

  if (!anchorIndex.has(manifest.origin_anchor_id)) {
    issues.push({
      anchorId: manifest.origin_anchor_id,
      field: "origin_anchor_id",
      expected: "existing anchor id",
      actual: "missing",
    });
  }

  return {
    valid: issues.length === 0,
    checkedAnchors: manifest.anchors.length,
    maximumProjectionErrorM,
    maximumLocalOffsetErrorM,
    issues,
  };
}
