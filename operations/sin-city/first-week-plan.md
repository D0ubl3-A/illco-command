# First-Week Plan

## Priority 1 — Durable control ledger
Continue exact non-overlapping 20-section batches with deterministic bounds, neighbors, validation, and continuity pointers.

## Priority 2 — Evidence intake contract
Locate and validate `building_registry.*`, `terrain_manifest.json`, coordinate/gate/section/source contracts, authoritative parcels/right-of-way, production terrain, canonical road transform, and original binary sprites.

## Priority 3 — Gate automation
Add schema checks for unique IDs, in-grid 1 km bounds, required evidence references, centerline/pavement separation, QA receipts, and explicit production authorization.

## Stop conditions
Stop joins or placement when provenance is absent, coordinates conflict, a checksum changes unexpectedly, a duplicate section appears, or any production gate is not PASS.

## Next execution
Register `SC_01_05` through `SC_01_24`; do not process a second duplicate batch.
