/**
 * ReelWorld GO — Lens Studio scene integration boundary.
 *
 * This file intentionally avoids unverified Lens Studio API symbols.
 * Implement LensBindings in the Lens Studio/CLAD project after inspecting
 * the installed SDK and generated scene objects. It is NOT a native Lens.
 */
import { initialState, transition, type Action, type GameState, type Point3 } from "./create-water-controller";

export type PlacementHit = {
  position: Point3;
  surfaceNormal: Point3;
  confidence?: number;
};
export interface LensBindings {
  /** Return a real supported hit-test result; null when none is available. */
  queryPlacement(): PlacementHit | null;
  /** Anchor or position the lake root at the approved location. */
  placeLake(position: Point3, radiusMeters: number): void;
  /** Update all rendered elements from the authoritative game state. */
  render(state: Readonly<GameState>): void;
  /** Display instructions in a comfortable, readable location. */
  announce(message: string): void;
}
export class ReelWorldLakeScene {
  private state: GameState = { ...initialState };
  constructor(private readonly lens: LensBindings) {
    this.lens.render(this.state);
  }
  getState(): Readonly<GameState> { return this.state; }
  dispatch(action: Action): Readonly<GameState> {
    const prior = this.state;
    this.state = transition(prior, action);
    if (prior.phase === "placement" && this.state.phase === "ready" && this.state.lake) {
      this.lens.placeLake(this.state.lake.position, this.state.lake.radiusMeters);
    }
    if (prior.message !== this.state.message) this.lens.announce(this.state.message);
    this.lens.render(this.state);
    return this.state;
  }
  /** Invoke from a supported SPECS selection action after a user confirms placement. */
  confirmLakePlacement(): boolean {
    if (this.state.phase !== "placement") return false;
    const hit = this.lens.queryPlacement();
    if (!hit || !this.isUsableSurface(hit)) {
      this.lens.announce("Look at a clear, level surface and try again.");
      return false;
    }
    this.dispatch({ type: "PLACE_LAKE", position: hit.position, radiusMeters: 1.2 });
    return true;
  }
  /** Invoke from the Lens Studio update loop, using frame delta seconds. */
  update(deltaSeconds: number): void {
    if (this.state.phase === "cast") this.dispatch({ type: "TICK", deltaSeconds });
  }
  /** Reject steep surfaces; confidence thresholds depend on the actual device API. */
  private isUsableSurface(hit: PlacementHit): boolean {
    const n = hit.surfaceNormal;
    const magnitude = Math.hypot(n.x, n.y, n.z);
    return magnitude > 0.001 && Math.abs(n.y / magnitude) >= 0.9 &&
      [hit.position.x, hit.position.y, hit.position.z].every(Number.isFinite);
  }
}
