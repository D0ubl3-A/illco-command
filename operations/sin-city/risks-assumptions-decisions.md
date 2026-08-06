# Risks, Assumptions, and Decisions

## Risks
- Missing source contracts can cause false placement or unverifiable reconstruction.
- Navigation centerlines may be mistaken for visible pavement.
- Recreated or preview assets may be mislabeled as original binary assets.
- Duplicate batches can corrupt cumulative progress.
- A registration percentage may be mistaken for production readiness.

## Assumptions
- Grid origin, bounds, CRS, dimensions, and row-major order remain authoritative until contradicted by original evidence.
- Unknown source-dependent fields remain blocked rather than estimated.

## Decisions
- Exactly one 20-section batch per hourly map lane.
- Existing validated ledger entries are immutable unless a regression is evidenced.
- Production-ready percentage uses only sections with every required gate PASS.
- World placement and SinCityNGen recording remain blocked for control-only sections.
