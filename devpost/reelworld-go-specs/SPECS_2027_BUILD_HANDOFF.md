# ReelWorld GO — SPECS 2027 native build handoff

**Status:** Prepared for native integration, **not yet a runnable Lens**, .lsproj or glasses deployment. Preserve the browser game unchanged.

## Target and evidence
- Target: **SPECS 27** (not Spectacles 2024). Install the current SPECS-supported Lens Studio from https://ar.snap.com/download and sign in with the SPECS developer account.
- Existing portable source: `src/create-water-controller.ts`, `src/lake-geometry.ts`, `src/lens-scene-adapter.ts`.
- Required deliverable: actual Lens Studio-native project (.lsproj plus assets), Preview proof and a verified on-glasses deployment workflow. No native project exists in this repository at time of this handoff.

## CLAD/agent build request (paste into Lens Studio's supported agent workflow)
Build a native SPECS 27 Lens Studio project titled **ReelWorld GO — Create Water** using the portable TypeScript state machine and geometry in this directory as authoritative references. Inspect installed SDK documentation and examples before using APIs; do not hallucinate API signatures. Preserve the original web game.

1. Create a real native Lens Studio project in a separate `native-specs27/` output directory, targeting SPECS 27 and the installed compatible SDK. Generate actual native script components and scene objects (not a mock .lsproj).
2. World view is camera/see-through only: NO skybox, mountains, hills, simulated real-world terrain or horizon. Lake is a virtual transparent water disk initially radius 1.2 meters; optional shoreline only if visibly appropriate and non-obstructive.
3. Use device-supported surface query, horizontal-normal validation, user confirmation and stable world anchor. Never place water without a valid, safe surface; ensure lake remains fixed through head movement.
4. Implement actions: PLACE_LAKE, CAST, TICK, HOOK, REEL, REPLAY; keep the existing controller transitions and bounds. Provide feedback for the bite after 2.5 seconds and support repeat catches. Connect frame delta time and actual supported SPECS input to the scene adapter.
5. Build lake mesh from `lake-geometry.ts`; convert Y-up meters to Lens Studio's real coordinate/unit convention after checking SDK. Animate water ripple, bobber, line and fish. Keep the fish within the lake.
6. Import the original ReelWorld GO fish model/texture/animations only if actually located and licensed in the existing project. Otherwise mark the visual as **placeholder / blocked**; don't claim parity or silently replace originals.
7. Run portable TypeScript tests and native Lens Studio Preview. Fix failures, inspect logs, capture a screenshot and record frame-rate/behavior. Test placement, anchoring, casting, bite, hook, reel, catch, replay and invalid-surface rejection.
8. Test on actual paired SPECS 27 hardware through Lens Studio's supported authenticated send/install process. Only then provide the verified one-click entry from the glasses' Lens launcher (and publish/share only through supported channels and with authorization). Do not claim a direct OS executable or standalone .cmd on the glasses.
9. Deliver `native-specs27/`, documented dependencies and original asset sources, `BUILD_RESULTS.md` with real test outcomes, and deployment instructions. If blocked by device/account/SDK, list the specific blockers.

## Local developer entry
On Windows, double-click `RUN_SPECS_2027.cmd` from this directory, **with the entire directory checked out**. It checks source presence, optionally runs TypeScript tests, copies this handoff, and opens Lens Studio or its download page. It does **not** create native device bindings itself.

## Acceptance gates
- [ ] Actual native .lsproj opens
- [ ] No missing or unauthorized assets
- [ ] Preview pass with evidence
- [ ] Stable surface placement and anchor
- [ ] Full cast-to-catch/replay loop
- [ ] Correct world scale and transparent background
- [ ] Original fish assets used or gap identified
- [ ] Hardware validation on SPECS 27
- [ ] Launch flow on glasses verified
