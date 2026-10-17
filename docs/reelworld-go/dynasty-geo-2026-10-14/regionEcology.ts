import type { MapFeature } from '../types';

/**
 * Source-grounded regional gameplay roster. This is deliberately a small,
 * explicit allowlist; do not infer fish presence from GPS latitude alone.
 * Reference data is NOT live wildlife telemetry and does NOT grant fishing rights.
 */
export interface RegionalRoster {
  id: 'lake-mead' | 'lake-havasu';
  name: string;
  speciesIds: readonly string[];
  source: string;
  checkedOn: string;
}

export const REGIONAL_ROSTERS: readonly RegionalRoster[] = [
  {
    id: 'lake-mead',
    name: 'Lake Mead',
    speciesIds: ['bluegill', 'crappie', 'largemouth', 'catfish'],
    source: 'https://www.ndow.org/waters/lake-mead/',
    checkedOn: '2026-10-14'
  },
  {
    id: 'lake-havasu',
    name: 'Lake Havasu',
    speciesIds: ['bluegill', 'crappie', 'largemouth', 'catfish'],
    source: 'https://www.golakehavasu.com/things-to-do/outdoor-adventures/fishing/',
    checkedOn: '2026-10-14'
  }
] as const;

function normalizeWaterName(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function regionalRosterForWater(feature: MapFeature | null | undefined): RegionalRoster | null {
  if (!feature || feature.kind !== 'water') return null;
  const name = normalizeWaterName(feature.name);
  if (name === 'lake mead' || name === 'mead reservoir') return REGIONAL_ROSTERS[0];
  if (name === 'lake havasu' || name === 'havasu lake') return REGIONAL_ROSTERS[1];
  return null;
}