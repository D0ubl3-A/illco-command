# Sin City Authoritative Map Validation Report

**Run:** 2026-08-08 13:58 America/Los_Angeles  
**Batch:** 036  
**Authorization:** BLOCKED — CONTROL GEOMETRY ONLY

## Status

- Batch completion: **20/20 — 100%**
- Cumulative unique sections: **720/1,225 — 58.78%**
- Production-ready sections: **0/1,225 — 0.00%**
- Remaining sections: **505**
- Readiness score: **50/100**
- Current milestone: permanent control-geometry registration of 720 unique sections
- Next milestone: register `SC_20_20` through `SC_21_04`

## Sections processed this run

`SC_20_00` through `SC_20_19`.

## Validation results

PASS:
- Exactly 20 new row-major section IDs were registered after direct ledger verification at 700 sections.
- Batch 036 begins immediately after verified continuity pointer `SC_20_00` and is disjoint from the prior ledger.
- Every section is within the 35 × 35 EPSG:32611 grid.
- Every bound is exactly 1,000 m × 1,000 m.
- West/east/south/north grid neighbors were recorded, with nulls only at grid edges.
- Navigation centerlines and visible pavement remain separate requirements.
- Empty anchors/source-evidence state was preserved rather than fabricated.
- Authoritative source registry remains attached.
- Canonical source-to-project CRS transform contract remains defined but unapplied to section evidence.
- Unsupported world placement and SinCityNGen recording remain blocked.
- Prior workspace blob SHA preserved: `b5b83838be93be5431ade36009cc5f9aa9c287f4`.
- Batch 036 commit: `532dc4fad25b6329bedcbc3ed175a78702d9036f`.
- Ledger commit: `83156bf08ef3f3bfb86344742f7da1dac46389ec`.

BLOCKED:
- Production terrain
- Parcel/right-of-way ingestion
- Building ingestion and coverage check
- Road ingestion beyond control geometry
- Identities
- Architecture
- Binary assets
- Full 50-issue repair/QA pass

## Readiness deductions

-15 no production terrain manifest or tiles  
-15 authoritative parcel/right-of-way sources registered but not ingested/joined  
-15 building source registered but no building registry or evidence-backed sprites  
-5 no section has passed 50-issue QA

## Approvals needed

No production placement or recording approval is supportable until original evidence is ingested and every production gate passes.

## Verified changes

- Registered exactly 20 additional unique one-kilometer sections.
- Advanced durable control-geometry coverage from 700 to 720 sections.
- Preserved authoritative-source and CRS contracts.
- Preserved fail-closed production authorization.
- Refreshed client status and validation surfaces to Batch 036.

## Unresolved evidence gaps

No original section-level source evidence or anchors were available for Batch 036. No production terrain, parcel, building, road, identity, architecture, or binary-asset join was performed or claimed.

## Continuity pointer

Next unregistered section: `SC_20_20`  
Next batch end: `SC_21_04`
