const WGS84_SEMI_MAJOR_AXIS_M = 6_378_137.0;
const WGS84_FLATTENING = 1 / 298.257223563;
const UTM_SCALE_FACTOR = 0.9996;
const UTM_FALSE_EASTING_M = 500_000;
const UTM_FALSE_NORTHING_SOUTH_M = 10_000_000;

export type UtmHemisphere = "N" | "S";

export interface UtmCoordinate {
  zone: number;
  hemisphere: UtmHemisphere;
  eastingM: number;
  northingM: number;
}

function assertFiniteCoordinate(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || latitude < -80 || latitude > 84) {
    throw new RangeError(`UTM latitude must be finite and between -80 and 84 degrees; received ${latitude}`);
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError(`Longitude must be finite and between -180 and 180 degrees; received ${longitude}`);
  }
}

function assertUtmZone(zone: number): void {
  if (!Number.isInteger(zone) || zone < 1 || zone > 60) {
    throw new RangeError(`UTM zone must be an integer from 1 through 60; received ${zone}`);
  }
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function inferUtmZone(longitude: number): number {
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError(`Longitude must be finite and between -180 and 180 degrees; received ${longitude}`);
  }

  if (longitude === 180) {
    return 60;
  }

  return Math.floor((longitude + 180) / 6) + 1;
}

/**
 * Converts WGS84 latitude/longitude to a UTM coordinate using the standard
 * sixth-order Transverse Mercator series. Output uses JavaScript float64.
 */
export function wgs84ToUtm(
  latitude: number,
  longitude: number,
  requestedZone = inferUtmZone(longitude),
): UtmCoordinate {
  assertFiniteCoordinate(latitude, longitude);
  assertUtmZone(requestedZone);

  const eccentricitySquared = WGS84_FLATTENING * (2 - WGS84_FLATTENING);
  const secondEccentricitySquared = eccentricitySquared / (1 - eccentricitySquared);

  const latitudeRad = degreesToRadians(latitude);
  const longitudeRad = degreesToRadians(longitude);
  const centralMeridianDeg = (requestedZone - 1) * 6 - 180 + 3;
  const centralMeridianRad = degreesToRadians(centralMeridianDeg);

  const sinLatitude = Math.sin(latitudeRad);
  const cosLatitude = Math.cos(latitudeRad);
  const tanLatitude = Math.tan(latitudeRad);

  const radiusOfCurvatureM =
    WGS84_SEMI_MAJOR_AXIS_M /
    Math.sqrt(1 - eccentricitySquared * sinLatitude * sinLatitude);

  const tangentSquared = tanLatitude * tanLatitude;
  const eccentricityPrimeTerm = secondEccentricitySquared * cosLatitude * cosLatitude;
  const longitudeTerm = cosLatitude * (longitudeRad - centralMeridianRad);

  const eccentricityFourth = eccentricitySquared * eccentricitySquared;
  const eccentricitySixth = eccentricityFourth * eccentricitySquared;

  const meridionalArcM =
    WGS84_SEMI_MAJOR_AXIS_M *
    ((1 -
      eccentricitySquared / 4 -
      (3 * eccentricityFourth) / 64 -
      (5 * eccentricitySixth) / 256) *
      latitudeRad -
      ((3 * eccentricitySquared) / 8 +
        (3 * eccentricityFourth) / 32 +
        (45 * eccentricitySixth) / 1024) *
        Math.sin(2 * latitudeRad) +
      ((15 * eccentricityFourth) / 256 + (45 * eccentricitySixth) / 1024) *
        Math.sin(4 * latitudeRad) -
      ((35 * eccentricitySixth) / 3072) * Math.sin(6 * latitudeRad));

  const eastingM =
    UTM_SCALE_FACTOR *
      radiusOfCurvatureM *
      (longitudeTerm +
        ((1 - tangentSquared + eccentricityPrimeTerm) * longitudeTerm ** 3) / 6 +
        ((5 -
          18 * tangentSquared +
          tangentSquared ** 2 +
          72 * eccentricityPrimeTerm -
          58 * secondEccentricitySquared) *
          longitudeTerm ** 5) /
          120) +
    UTM_FALSE_EASTING_M;

  let northingM =
    UTM_SCALE_FACTOR *
    (meridionalArcM +
      radiusOfCurvatureM *
        tanLatitude *
        (longitudeTerm ** 2 / 2 +
          ((5 -
            tangentSquared +
            9 * eccentricityPrimeTerm +
            4 * eccentricityPrimeTerm ** 2) *
            longitudeTerm ** 4) /
            24 +
          ((61 -
            58 * tangentSquared +
            tangentSquared ** 2 +
            600 * eccentricityPrimeTerm -
            330 * secondEccentricitySquared) *
            longitudeTerm ** 6) /
            720));

  const hemisphere: UtmHemisphere = latitude >= 0 ? "N" : "S";
  if (hemisphere === "S") {
    northingM += UTM_FALSE_NORTHING_SOUTH_M;
  }

  return {
    zone: requestedZone,
    hemisphere,
    eastingM,
    northingM,
  };
}
