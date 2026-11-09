/**
 * ReelWorld GO — portable water-only scene presentation.
 * This is a deterministic view model, NOT a native Lens Studio renderer.
 * It deliberately contains no mountains, terrain, skybox or scenery.
 */
import type { GameState, Point3 } from "./create-water-controller";
import { createLakeGeometry } from "./lake-geometry";

export type VisualNode = {
  id: "water" | "bobber" | "fish" | "line" | "splash";
  visible: boolean;
  position: Point3;
  scale: number;
  animation: "none" | "ripple" | "float" | "swim" | "splash";
  assetId?: string;
};
export type ScenePresentation = {
  transparentBackground: true;
  waterOnly: true;
  nodes: VisualNode[];
  instruction: string;
  fishAssetStatus: "missing-original-assets" | "provided-original-assets";
};
export function presentLake(state: Readonly<GameState>, originalFishAssetId?: string): ScenePresentation {
  const radius = state.lake?.radiusMeters ?? 1.2;
  const origin = state.lake?.position ?? { x: 0, y: 0, z: 0 };
  const visible = Boolean(state.lake);
  const phase = state.phase;
  const castActive = phase === "cast" || phase === "bite" || phase === "hooked";
  const path = createLakeGeometry(radius).fishPath;
  const step = Math.min(path.length - 1, Math.floor(state.biteTimer * 8) % path.length);
  const fish = path[step];
  const p = (x: number, y: number, z: number): Point3 => ({
    x: origin.x + x, y: origin.y + y, z: origin.z + z
  });
  return {
    transparentBackground: true,
    waterOnly: true,
    instruction: state.message,
    fishAssetStatus: originalFishAssetId ? "provided-original-assets" : "missing-original-assets",
    nodes: [
      { id: "water", visible, position: p(0,0,0), scale: radius, animation: "ripple" },
      { id: "bobber", visible: castActive, position: p(0,0.06,-radius*0.3), scale: 1, animation: "float" },
      { id: "fish", visible: visible && phase === "hooked" && Boolean(originalFishAssetId),
        position: p(fish[0],fish[1],fish[2]), scale: 1, animation: "swim", assetId: originalFishAssetId },
      { id: "line", visible: castActive, position: p(0,0.06,-radius*0.3), scale: 1, animation: "none" },
      { id: "splash", visible: phase === "bite" || phase === "caught",
        position: p(0,0.01,-radius*0.3), scale: 1, animation: "splash" }
    ]
  };
}
