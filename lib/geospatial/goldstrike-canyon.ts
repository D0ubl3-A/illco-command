import manifestJson from "@/data/world/goldstrike-canyon/anchors.json";
import { wgs84ToUtm } from "@/lib/geospatial/wgs84-utm";

export type GoldstrikeEvidenceStatus =
  | "UNKNOWN"
  | "ESTIMATED"
  | "USER_REPORTED"
  | "SOURCE_CONFIRMED_SECONDARY"
  | "SOURCE_CONFIRMED_OFFICIAL"
  | "VISUALLY_CONFIRMED"
  | "MANUALLY_APPROVED";

export interface GoldstrikeAnchor {
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
  evidence_status: GoldstrikeEvidenceStatus;
  source_ids: string[];
  generation_status: string;
}

export interface GoldstrikeAccessRules {
  source_checked_at: string;
  annual_heat_closure_start_mmdd: string;
  annual_heat_closure_end_mmdd: string;
  temporary_heat_closure_threshold_f: number;
  forecast_reference_location: string;
  water_access_during_trail_closure: boolean;
  runtime_rule: string;
}

export interface GoldstrikeManifest {
  schema_version: string;
  region_id: "goldstrike_canyon_hot_springs";
  display_name: string;
  generated_at: string;
  horizontal_input_crs: "EPSG:4326";
  production_crs: "EPSG:32611";
  vertical_crs: "NAVD88";
  vertical_values_status: string;
  units: "meters";
  origin_anchor_id: string;
  linked_regions: string[];
  route_geometry_status: string;
  primary_pool_geometry_status: string;
  access_rules: GoldstrikeAccessRules;
  anchors: GoldstrikeAnchor[];
}

export interface GoldstrikeLocalEnuCoordinate {
  eastM: number;
  northM: number;
  upM: number | null;
}

export interface GoldstrikeValidationIssue {
  anchorId: string;
  field: string;
  expected: number | string;
  actual: number | string;
  difference?: number;
}

export interface GoldstrikeValidationReport {
  valid: boolean;
  checkedAnchors: number;
  maximumProjectionErrorM: number;
  maximumLocalOffsetErrorM: number;
  issues: GoldstrikeValidationIssue[];
}

export type GoldstrikeLandTrailClosureReason =
  | "ANNUAL_HEAT_CLOSURE"
  | "FORECAST_HEAT_CLOSURE"
  | null;

export interface GoldstrikeAccessState {
  localDateIso: string;
  landTrailOpenByEncodedPolicy: boolean;
  landTrailClosureReason: GoldstrikeLandTrailClosureReason;
  waterAccessOpenByEncodedPolicy: boolean;
  officialConditionsRefreshRequired: true;
}

const manifest = manifestJson as GoldstrikeManifest;
const anchorIndex = new Map(manifest.anchors.map((anchor) => [anchor.id, anchor]));

function requireAnchor(anchorId: string): GoldstrikeAnchor {
  const anchor = anchorIndex.get(anchorId);
  if (!anchor) {
    throw new Error(`Unknown Goldstrike Canyon anchor: ${anchorId}`);
  }
  return anchor;
}

function parseMonthDayFromIsoDate(localDateIso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDateIso);
  if (!match) {
    throw new RangeError(
      `Goldstrike access dates must use YYYY-MM-DD without a time; received ${localDateIso}`,
    );
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid Goldstrike access date: ${localDateIso}`);
  }

  return `${monthText}-${dayText}`;
}

function isMonthDayWithinInclusiveRange(
  monthDay: string,
  startMonthDay: string,
  endMonthDay: string,
): boolean {
  if (startMonthDay <= endMonthDay) {
    return monthDay >= startMonthDay && monthDay <= endMonthDay;
  }

  return monthDay >= startMonthDay || monthDay <= endMonthDay;
}

export const GOLDSTRIKE_MANIFEST: Readonly<GoldstrikeManifest> = manifest;
export const GOLDSTRIKE_ANCHORS: readonly GoldstrikeAnchor[] = manifest.anchors;
export const GOLDSTRIKE_ORIGIN: Readonly<GoldstrikeAnchor> = requireAnchor(
  manifest.origin_anchor_id,
);

export function getGoldstrikeAnchor(
  anchorId: string,
): Readonly<GoldstrikeAnchor> {
  return requireAnchor(anchorId);
}

export function wgs84ToGoldstrikeLocal(
  latitude: number,
  longitude: number,
  elevationMNavd88: number | null = null,
): GoldstrikeLocalEnuCoordinate {
  const projected = wgs84ToUtm(latitude, longitude, 11);

  return {
    eastM: projected.eastingM - GOLDSTRIKE_ORIGIN.utm_easting_m,
    northM: projected.northingM - GOLDSTRIKE_ORIGIN.utm_northing_m,
    upM: elevationMNavd88,
  };
}

export function goldstrikeAnchorToUnityPosition(
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

export function goldstrikeAnchorToUnrealPositionCm(
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

export function getGoldstrikeAccessState(input: {
  localDateIso: string;
  forecastHighF?: number | null;
}): GoldstrikeAccessState {
  const monthDay = parseMonthDayFromIsoDate(input.localDateIso);
  const rules = manifest.access_rules;
  const annualClosure = isMonthDayWithinInclusiveRange(
    monthDay,
    rules.annual_heat_closure_start_mmdd,
    rules.annual_heat_closure_end_mmdd,
  );

  const forecastHighF = input.forecastHighF ?? null;
  if (forecastHighF !== null && !Number.isFinite(forecastHighF)) {
    throw new RangeError(
      `Goldstrike forecastHighF must be finite when supplied; received ${forecastHighF}`,
    );
  }

  const forecastClosure =
    !annualClosure &&
    forecastHighF !== null &&
    forecastHighF >= rules.temporary_heat_closure_threshold_f;

  const closureReason: GoldstrikeLandTrailClosureReason = annualClosure
    ? "ANNUAL_HEAT_CLOSURE"
    : forecastClosure
      ? "FORECAST_HEAT_CLOSURE"
      : null;

  return {
    localDateIso: input.localDateIso,
    landTrailOpenByEncodedPolicy: closureReason === null,
    landTrailClosureReason: closureReason,
    waterAccessOpenByEncodedPolicy:
      closureReason === null || rules.water_access_during_trail_closure,
    officialConditionsRefreshRequired: true,
  };
}

export function validateGoldstrikeManifest(
  projectionToleranceM = 0.02,
  localOffsetToleranceM = 0.02,
): GoldstrikeValidationReport {
  const issues: GoldstrikeValidationIssue[] = [];
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

    if (projectionErrorM > projectionToleranceM) {
      issues.push({
        anchorId: anchor.id,
        field: "utm_projection",
        expected: `${projected.eastingM},${projected.northingM}`,
        actual: `${anchor.utm_easting_m},${anchor.utm_northing_m}`,
        difference: projectionErrorM,
      });
    }

    const expectedLocalEastM = projected.eastingM - GOLDSTRIKE_ORIGIN.utm_easting_m;
    const expectedLocalNorthM =
      projected.northingM - GOLDSTRIKE_ORIGIN.utm_northing_m;
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

    if (projected.hemisphere !== anchor.hemisphere) {
      issues.push({
        anchorId: anchor.id,
        field: "hemisphere",
        expected: projected.hemisphere,
        actual: anchor.hemisphere,
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

  if (manifest.primary_pool_geometry_status !== "PENDING_FIELD_ORTHO_ALIGNMENT") {
    issues.push({
      anchorId: "manifest",
      field: "primary_pool_geometry_status",
      expected: "PENDING_FIELD_ORTHO_ALIGNMENT",
      actual: manifest.primary_pool_geometry_status,
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
