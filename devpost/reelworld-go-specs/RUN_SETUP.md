# ReelWorld GO — SPECS Run Setup

## Current status (2026-11-09)
This repository contains a portable fishing state machine, geometry generator, tests and a Lens adapter interface. It does NOT yet contain a native Lens Studio project (.lsproj), working native interaction bindings, original online fish model files, or a Preview test result. Do not mark this playable in native SPECS until verified.

## 1. Install the correct editor
- SPECS 27: https://ar.snap.com/download (Lens Studio 5.24.1 at time of preparation).
- Spectacles (2024): https://ar.snap.com/lts (Lens Studio 5.15.4).
- Requires Windows 11 64-bit or macOS 12+, supported graphics hardware.
- Sign in with the matching developer account. For SPECS 27, use the SPECS account.

## 2. Clone and inspect
```bash
git clone https://github.com/D0ubl3-A/illco-command.git
cd illco-command/devpost/reelworld-go-specs
```
Read src/create-water-controller.ts, src/lake-geometry.ts and src/lens-scene-adapter.ts. These are portable TypeScript files; Lens Studio may require TypeScript transpilation and SDK-specific wrappers.

## 3. Build the native project in Lens Studio
1. Create a NEW project targeting your actual SPECS hardware. Do not overwrite the online ReelWorld game.
2. Enable the device-appropriate spatial tracking / world placement feature.
3. Create scene root: ReelWorldLakeRoot. Use transparent world/background; do NOT add mountains, skyboxes, terrain or artificial horizon.
4. Add water disk (radius 1.2 m) and optional narrow shoreline only if requested. Use transparent animated water material with ripples.
5. Add a bobber, rod/line and fish visual. Import original ReelWorld GO fish assets from the web game's source/asset library, not substitutes. Record provenance and permission. If unavailable, leave a placeholder explicitly marked as such.
6. Implement SDK-supported placement hit-testing, world anchoring, user confirmation, frame updates, selection/cast/hook/reel inputs, text UI, and fish animation. Map the Lens bindings interface to native components.
7. Verify scene dimensions: portable geometry uses meters/Y-up; Lens Studio units and coordinate conventions must be converted after checking SDK.
8. Use CLAD / Lens Studio MCP if available to inspect scene and run Preview; do not invent API signatures.

## 4. Preview acceptance checklist
- [ ] Project opens without missing asset errors
- [ ] Lens target matches hardware and firmware
- [ ] Transparent world: no mountains, no landscape
- [ ] Safe surface selection places water and persists during head motion
- [ ] Cast blocked until lake placed
- [ ] Cast -> bite -> hook -> reel -> catch -> replay completes
- [ ] Original online fish models/textures/animations visibly match
- [ ] Fish stays inside water and does not float in sky
- [ ] Input works with actual device-supported controls
- [ ] FPS and stability measured in Preview and on device
- [ ] No regression to online ReelWorld GO
- [ ] Screenshot/video + logs stored as evidence

## 5. Development logic tests
The existing .test.ts files use node:test and TypeScript imports. Choose a compatible TypeScript execution tool (for example, Node with supported TS stripping or tsx), then execute tests. They have not been run by this assistant.

## 6. Known blockers
- No native .lsproj in this repo.
- No access to user's local Lens Studio session, device or Preview.
- Original online fish asset files not located.
- Runtime-specific APIs, unit conversions and tracking performance unverified.

## 7. One-shot CLAD build instruction
Open Lens Studio and connect CLAD/MCP, then issue:

"Create a native SPECS Create Water Mode Lens for ReelWorld GO. Use the portable controller, geometry, and adapter in devpost/reelworld-go-specs/src as reference. Transparent real-world background, no mountains, no skybox, virtual circular water only. Confirm safe surface before placing a stable lake anchor. Preserve cast/bite/hook/reel/catch/replay. Import exact original fish assets from the existing ReelWorld GO source if accessible; otherwise flag missing assets, do not fabricate parity. Use only APIs confirmed for the installed Lens Studio version. Run Preview, inspect logs, fix errors, report test evidence, and export the .lsproj. Never claim success without a working Preview run."
