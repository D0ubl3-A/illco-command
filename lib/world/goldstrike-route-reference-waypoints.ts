import waypointsJson from "@/data/world/goldstrike-canyon/route-reference-waypoints.json";

export interface GoldstrikeRouteReferenceWaypoint {
  id: string;
  name: string;
  feature_type: string;
  latitude: number;
  longitude: number;
  utm_easting_m: number;
  utm_northing_m: number;
  local_east_m: number;
  local_north_m: number;
  elevation_m_source: number | null;
  horizontal_accuracy_m: number | null;
  source_id: string;
  evidence_status: "SOURCE_CONFIRMED_SECONDARY";
}

interface GoldstrikeRouteReferenceManifest {
  schema_version: string;
  region_id: string;
  generated_at: string;
  horizontal_crs: string;
  production_crs: string;
  origin_anchor_id: string;
  accuracy_policy: string;
  waypoints: GoldstrikeRouteReferenceWaypoint[];
}

const manifest = waypointsJson as GoldstrikeRouteReferenceManifest;
const waypointIndex = new Map(
  manifest.waypoints.map((waypoint) => [waypoint.id, waypoint]),
);

export const GOLDSTRIKE_ROUTE_REFERENCE_MANIFEST = manifest;
export const GOLDSTRIKE_ROUTE_REFERENCE_WAYPOINTS: readonly GoldstrikeRouteReferenceWaypoint[] =
  manifest.waypoints;

export function getGoldstrikeRouteReferenceWaypoint(
  waypointId: string,
): Readonly<GoldstrikeRouteReferenceWaypoint> {
  const waypoint = waypointIndex.get(waypointId);
  if (!waypoint) {
    throw new Error(`Unknown Goldstrike route-reference waypoint: ${waypointId}`);
  }
  return waypoint;
}
