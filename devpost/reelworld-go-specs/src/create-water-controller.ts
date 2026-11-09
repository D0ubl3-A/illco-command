/**
 * ReelWorld GO — Create Water Mode gameplay controller.
 * Portable TypeScript logic. Native Lens Studio bindings are still required.
 * No browser APIs, network, account system, or payments.
 */
export type Phase = "placement" | "ready" | "cast" | "bite" | "hooked" | "caught";
export type Point3 = { x: number; y: number; z: number };
export type LakePlacement = { position: Point3; radiusMeters: number };
export type GameState = {
  phase: Phase;
  lake: LakePlacement | null;
  biteTimer: number;
  reelProgress: number;
  fish: "largemouth-bass";
  catchCount: number;
  message: string;
};
export type Action =
  | { type: "PLACE_LAKE"; position: Point3; radiusMeters?: number }
  | { type: "CAST" }
  | { type: "TICK"; deltaSeconds: number }
  | { type: "HOOK" }
  | { type: "REEL"; amount: number }
  | { type: "REPLAY" }
  | { type: "RESET_PLACEMENT" };
export const initialState: GameState = {
  phase: "placement", lake: null, biteTimer: 0, reelProgress: 0,
  fish: "largemouth-bass", catchCount: 0, message: "Choose a safe flat surface to place your lake."
};
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const validPoint = (p: Point3) => [p.x,p.y,p.z].every(Number.isFinite);
export function transition(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "PLACE_LAKE":
      if (state.phase !== "placement" || !validPoint(action.position)) return state;
      return { ...state, phase: "ready", lake: {
        position: { ...action.position },
        radiusMeters: clamp(Number.isFinite(action.radiusMeters ?? 1.2) ? (action.radiusMeters ?? 1.2) : 1.2, 0.4, 2.5)
      }, message: "Lake placed. Cast to begin!" };
    case "CAST":
      return state.phase === "ready" && state.lake
        ? { ...state, phase: "cast", biteTimer: 0, reelProgress: 0, message: "Watch the bobber..." } : state;
    case "TICK":
      if (state.phase !== "cast" || !Number.isFinite(action.deltaSeconds)) return state;
      const next = state.biteTimer + clamp(action.deltaSeconds, 0, 0.2);
      return next >= 2.5
        ? { ...state, phase: "bite", biteTimer: next, message: "Bite! Set the hook!" }
        : { ...state, biteTimer: next };
    case "HOOK":
      return state.phase === "bite"
        ? { ...state, phase: "hooked", message: "Fish on! Reel it in!" } : state;
    case "REEL":
      if (state.phase !== "hooked" || !Number.isFinite(action.amount)) return state;
      const progress = clamp(state.reelProgress + clamp(action.amount, 0, 1), 0, 1);
      return progress >= 1
        ? { ...state, phase: "caught", reelProgress: 1, catchCount: state.catchCount + 1,
            message: "Largemouth bass caught!" }
        : { ...state, reelProgress: progress };
    case "REPLAY":
      return state.phase === "caught"
        ? { ...state, phase: "ready", reelProgress: 0, biteTimer: 0, message: "Cast again!" } : state;
    case "RESET_PLACEMENT":
      return { ...initialState, catchCount: state.catchCount };
  }
}

/**
 * Lens Studio adapter TODO:
 * - Query world surface and reject unsafe/invalid placement.
 * - Render lake disk, water, shoreline, bobber, rod and bass as scene objects.
 * - Map supported SPECS interaction gestures to actions.
 * - Anchor lake scene root using supported WorldAnchor API.
 * - Run Preview and record actual outcomes.
 */
