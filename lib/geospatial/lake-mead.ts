import manifestJson from "@/data/world/lake-mead/anchors.json";
import { wgs84ToUtm } from "@/lib/geospatial/wgs84-utm";

export type EvidenceStatus =
  | "UNKNOWN"
  | "ESTIMATED"
  | "USER_REPORTED"
  | "SOURCE_CONFIRMED_SECONDARY"
  | "SOURCE_CONFIRMED_OFFICIAL"
  | "VISUALLY_CONFIRMED"
  | "MANUALLY_APPROVED";

export interface LakeMeadAnchor {
  id: string;
  name: string;
  label: string;
  type: string;
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
  evidence_status: EvidenceStatus;
  source_ids: string[];
  generation_status: string;
}

export interface LakeMeadManifest {
  schema_version: string;
  region_id: "lake_mead";
  display_name: string;
  generated_at: string;
  horizontal_input_crs: "EPSG:4326";
  production_crs: "EPSG:32611";
  vertical_crs: "NAVD88";
  vertical_values_status: string;
  units: "meters";
  origin_anchor_id: string;
  anchors: LakeMeadAnchor[];
}

export interface LocalEnuCoordinate {
  eastM: number;
  northM: number;
  upM: number | null;
}

export interface AnchorValidationIssue {
  anchorId: string;
  field: string;
  expected: number | string;
  actual: number | string;
  difference?: number;
}

export interface AnchorValidationReport {
  valid: boolean;
  checkedAnchors: number;
  maximumProjectionErrorM: number;
  maximumLocalOffsetErrorM: number;
  issues: AnchorValidationIssue[];
}

const manifest = manifestJson as LakeMeadManifest;
const anchorIndex = new Map(manifest.anchors.map((anchor) => [anchor.id, anchor]));

function requireAnchor(anchorId: string): LakeMeadAnchor {
  const anchor = anchorIndex.get(anchorId);
  if (!anchor) {
    throw new Error(`Unknown Lake Mead anchor: ${anchorId}`);
  }
  return anchor;
}

export const LAKE_MEAD_MANIFEST: Readonly<LakeMeadManifest> = manifest;
export const LAKE_MEAD_ANCHORS: readonly LakeMeadAnchor[] = manifest.anchors;
export const LAKE_MEAD_ORIGIN: Readonly<LakeMeadAnchor> = requireAnchor(
  manifest.origin_anchor_id,
);

export function getLakeMeadAnchor(anchorId: string): Readonly<LakeMeadAnchor> {
  return requireAnchor(anchorId);
}

export function wgs84ToLakeMeadLocal(
  latitude: number,
  longitude: number,
  elevationMNavd88: number | null = null,
): LocalEnuCoordinate {
  const projected = wgs84ToUtm(latitude, longitude, 11);

  return {
    eastM: projected.eastingM - LAKE_MEAD_ORIGIN.utm_easting_m,
    northM: projected.northingM - LAKE_MEAD_ORIGIN.utm_northing_m,
    upM: elevationMNavd88,
  };
}

export function anchorToUnityPosition(
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

export function anchorToUnrealPositionCm(
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

export function validateLakeMeadManifest(
  projectionToleranceM = 0.02,
  localOffsetToleranceM = 0.02,
): AnchorValidationReport {
  const issues: AnchorValidationIssue[] = [];
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
    const eastingErrorM = Math.abs(projected.eastingM - anchor.utm_easting_m);
    const northingErrorM = Math.abs(projected.northingM - anchor.utm_northing_m);
    const projectionErrorM = Math.hypot(eastingErrorM, northingErrorM);
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

    const expectedLocalEastM = projected.eastingM - LAKE_MEAD_ORIGIN.utm_easting_m;
    const expectedLocalNorthM =
      projected.northingM - LAKE_MEAD_ORIGIN.utm_northing_m;
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
