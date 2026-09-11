export type WaterKind = "container" | "puddle" | "pond" | "lake" | "river" | "unknown";
export type Region = "southwest" | "southeast" | "midwest" | "north" | "australia" | "unknown";
export type Handedness = "right" | "left";
export type RetrieveMode = "shore" | "jig" | "troll" | "spinner";
export type FightStatus = "fighting" | "landed" | "escaped" | "snapped";

export type WaterBounds = { left: number; top: number; right: number; bottom: number; coverage: number };
export type FishDefinition = {
  species: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  regions: Region[];
  waters: WaterKind[];
  minLb: number;
  maxLb: number;
  minHook: number;
  maxHook: number;
  baits: string[];
  xp: number;
};

export type FishInstance = FishDefinition & {
  weight: number;
  estimated: boolean;
  visualScale: number;
};

export type FightState = {
  tension: number;
  stamina: number;
  progress: number;
  status: FightStatus;
};

export type FightInput = {
  reeling: boolean;
  drag: number;
  lineLb: number;
  fishWeight: number;
  fishPower: number;
  rodDamping: number;
  dtMs?: number;
  jolt?: number;
};

export const FISH_CATALOG: FishDefinition[] = [
  { species: "Bluegill", rarity: "common", regions: ["southwest","southeast","midwest","north"], waters: ["container","puddle","pond","lake","river"], minLb: .15, maxLb: 2.1, minHook: 6, maxHook: 12, baits: ["worms","corn","minnows"], xp: 28 },
  { species: "Channel Catfish", rarity: "uncommon", regions: ["southwest","southeast","midwest"], waters: ["pond","lake","river"], minLb: 1.5, maxLb: 24, minHook: 2, maxHook: 8, baits: ["worms","minnows"], xp: 62 },
  { species: "Largemouth Bass", rarity: "uncommon", regions: ["southwest","southeast","midwest"], waters: ["pond","lake","river"], minLb: .8, maxLb: 13, minHook: 2, maxHook: 8, baits: ["minnows","spinner","frog"], xp: 75 },
  { species: "Rainbow Trout", rarity: "rare", regions: ["southwest","north","unknown"], waters: ["pond","lake","river"], minLb: .5, maxLb: 15, minHook: 6, maxHook: 12, baits: ["worms","spinner"], xp: 125 },
  { species: "Northern Pike", rarity: "rare", regions: ["midwest","north"], waters: ["lake","river"], minLb: 3, maxLb: 38, minHook: 1, maxHook: 5, baits: ["minnows","spinner","frog"], xp: 180 },
  { species: "Common Carp", rarity: "uncommon", regions: ["southwest","southeast","midwest","north","unknown"], waters: ["pond","lake","river"], minLb: 2, maxLb: 42, minHook: 2, maxHook: 8, baits: ["corn","worms"], xp: 95 },
  { species: "Striped Bass", rarity: "rare", regions: ["southwest","southeast"], waters: ["lake","river"], minLb: 2, maxLb: 45, minHook: 1, maxHook: 5, baits: ["minnows","spinner"], xp: 190 },
  { species: "Redfin Perch", rarity: "uncommon", regions: ["australia"], waters: ["pond","lake","river"], minLb: .3, maxLb: 6, minHook: 4, maxHook: 10, baits: ["worms","minnows","spinner"], xp: 80 },
];

export const REAL_MONEY_TOURNAMENTS_ENABLED = false;
export const REAL_MONEY_DISABLED_REASON = "Real-money tournaments are disabled until server-authoritative scoring, anti-cheat, payments/refunds, terms, jurisdiction and payout compliance are verified.";

export function clamp(value: number, min = 0, max = 100) { return Math.max(min, Math.min(max, value)); }

export function regionFor(lat: number, lon: number): Region {
  if (lat < -10 && lon > 110 && lon < 155) return "australia";
  if (lat >= 30 && lat <= 43 && lon <= -102 && lon >= -125) return "southwest";
  if (lat >= 24 && lat <= 37 && lon > -102 && lon <= -75) return "southeast";
  if (lat >= 36 && lat <= 50 && lon > -102 && lon <= -82) return "midwest";
  if (lat > 43 && lon >= -125 && lon <= -70) return "north";
  return "unknown";
}

export function waterKindFromGeometry(bounds: WaterBounds): WaterKind {
  const width = Math.max(0, bounds.right - bounds.left);
  const height = Math.max(0, bounds.bottom - bounds.top);
  const area = width * height;
  if (bounds.coverage < .08 || area < .08) return "container";
  if (bounds.coverage < .22 || area < .2) return "puddle";
  if (bounds.coverage < .45) return "pond";
  return width > .75 && height < .5 ? "river" : "lake";
}

export function maxFishWeightForWater(kind: WaterKind) {
  return kind === "container" ? .6 : kind === "puddle" ? 1.5 : kind === "pond" ? 15 : kind === "river" ? 35 : kind === "lake" ? 50 : 8;
}

export function candidateFish(region: Region, water: WaterKind, bait: string, hookSize: number) {
  const maxWeight = maxFishWeightForWater(water);
  const candidates = FISH_CATALOG.filter(f =>
    (f.regions.includes(region) || f.regions.includes("unknown")) &&
    f.waters.includes(water) &&
    f.minLb <= maxWeight &&
    hookSize >= f.minHook && hookSize <= f.maxHook &&
    f.baits.includes(bait),
  );
  if (candidates.length) return candidates;
  return FISH_CATALOG.filter(f => f.species === "Bluegill" && f.waters.includes(water));
}

export function makeFish(def: FishDefinition, water: WaterKind, random = Math.random): FishInstance {
  const cap = Math.min(def.maxLb, maxFishWeightForWater(water));
  const min = Math.min(def.minLb, cap);
  const weight = +(min + random() * Math.max(.01, cap - min)).toFixed(2);
  const visualScale = fishVisualScale(weight, cap, water);
  return { ...def, weight, visualScale, estimated: true };
}

export function fishVisualScale(weight: number, maxWeight: number, water: WaterKind) {
  const normalized = Math.sqrt(clamp(weight / Math.max(.1, maxWeight), 0, 1));
  const base = .58 + normalized * .82;
  const waterCap = water === "container" ? .7 : water === "puddle" ? .9 : water === "pond" ? 1.15 : 1.4;
  return +Math.min(base, waterCap).toFixed(3);
}

export function constrainPointToWater(x: number, y: number, bounds: WaterBounds, margin = .04) {
  const left = clamp(bounds.left + margin, 0, 1);
  const right = clamp(bounds.right - margin, left, 1);
  const top = clamp(bounds.top + margin, 0, 1);
  const bottom = clamp(bounds.bottom - margin, top, 1);
  return { x: clamp(x, left, right), y: clamp(y, top, bottom) };
}

export function hookSetProbability(fishWeight: number, hookSize: number, motionStrength: number, source: "tap" | "motion") {
  const idealHook = fishWeight < 1 ? 10 : fishWeight < 5 ? 6 : fishWeight < 15 ? 4 : 2;
  const mismatch = Math.abs(hookSize - idealHook);
  const hookFit = clamp(1 - mismatch / 12, .2, 1);
  const motion = source === "motion" ? clamp(motionStrength / 10, .45, 1) : .72;
  return clamp(hookFit * motion, .1, .98);
}

export function lineSnapThreshold(lineLb: number, drag: number) {
  const lineFactor = clamp(lineLb / 20, .2, 1.4);
  const dragRelief = clamp((100 - drag) / 100, 0, 1) * 14;
  return clamp(78 + lineFactor * 15 + dragRelief, 82, 99);
}

export function fightStep(state: FightState, input: FightInput): FightState {
  if (state.status !== "fighting") return state;
  const dt = (input.dtMs ?? 220) / 220;
  const drag = clamp(input.drag, 0, 100);
  const fishRatio = input.fishWeight / Math.max(1, input.lineLb);
  const fishForce = input.fishPower * (0.7 + Math.min(2.2, fishRatio)) * input.rodDamping;
  const reelForce = input.reeling ? (1.15 + drag / 100 * 1.25) : -1.4;
  const jolt = input.jolt ?? 0;
  const nextTension = clamp(state.tension + (reelForce + fishForce * jolt + (52 - state.tension) * .035) * dt);
  const threshold = lineSnapThreshold(input.lineLb, drag);
  if (nextTension >= threshold) return { ...state, tension: nextTension, status: "snapped" };
  if (nextTension <= 1 && state.stamina > 35) return { ...state, tension: nextTension, status: "escaped" };
  const sweet = nextTension >= 18 && nextTension <= Math.min(88, threshold - 5);
  const staminaDrain = input.reeling && sweet ? (1.5 + drag / 100 * 1.2) * dt : -.22 * dt;
  const stamina = clamp(state.stamina - staminaDrain);
  const tiredBonus = (100 - stamina) / 100;
  const progressDelta = input.reeling ? (sweet ? 1.7 + tiredBonus * 2.3 : .25) * dt : -.12 * dt;
  const progress = clamp(state.progress + progressDelta - fishForce * .018 * dt);
  if (progress >= 100) return { tension: nextTension, stamina, progress: 100, status: "landed" };
  return { tension: nextTension, stamina, progress, status: "fighting" };
}

export function retrieveEffect(mode: RetrieveMode, opts: { speedMps: number; jigEnergy: number; bait: string }) {
  if (mode === "troll") return opts.speedMps >= .4 && opts.speedMps <= 4 ? 1.25 : .35;
  if (mode === "jig") return opts.jigEnergy >= .35 ? 1.22 : .55;
  if (mode === "spinner") return opts.bait === "spinner" ? 1.3 : .7;
  return 1;
}

export function reelGestureAccepted(angleDelta: number, handedness: Handedness) {
  if (Math.abs(angleDelta) < .04) return false;
  return handedness === "right" ? angleDelta < 0 : angleDelta > 0;
}

export function scoreCatch(catchRecord: { weight: number; xp: number }) {
  return Math.max(1, Math.round(catchRecord.weight * 10 + catchRecord.xp));
}
