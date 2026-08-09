# Risks, Assumptions, Decisions

**Updated:** 2026-08-09 11:19 America/Los_Angeles

## Risks
- Control-geometry progress can be mistaken for production completion.
- Source data may exist in registry but remain un-ingested at section level.
- Partial writes can desynchronize batch manifests and the ledger.
- Unsupported assets or placement can create false realism claims.

## Assumptions
- The fixed grid and row-major ordering remain authoritative unless explicitly migrated with evidence.
- Missing evidence is treated as unknown, not inferred.

## Decisions
- Ledger is read before every mutation.
- Production authorization remains fail-closed.
- Empty anchors/evidence arrays are preserved rather than fabricated.
- Navigation centerlines remain distinct from visible pavement.
- Batch 048 advances registration to **960/1,225** only.
