# illcoai.tech Diligence Data Room Index

Date: 2026-06-23
Status: Internal index

## Required Folders

| Section | Status | Required artifacts |
|---|---|---|
| 01 Strategy | review_ready | Acquisition thesis, ICP memo, acquirer matrix, buyer-specific integration notes. |
| 02 Product | in_progress | Product map, workflow maps, route health, proof videos, subscription/access evidence. |
| 03 AI Quality | in_progress | Gold set, benchmark report, drift checks, fallback policy, release gate. See `docs/confidence-fallback-policy.md`. |
| 04 Data and Privacy | in_progress | Data provenance ledger, retention/deletion policy, privacy policy, vendor handling. See `docs/data-provenance-ledger.md`. |
| 05 IP and Legal | missing | IP assignments, contributor ledger, license matrix, customer contract matrix. See `docs/legal-data-room-index-v3.md`. |
| 06 Security | in_progress | Access control summary, secrets policy, audit logs, incident response workflow. See `docs/security-posture-summary.md`. |
| 07 Financials | missing | Revenue, COGS/request, gross margin, retention, CAC/payback, expansion model. See `docs/cogs-and-margin-model.md`. |
| 08 GTM Proof | in_progress | Case studies, testimonials, sales objections, pipeline, source-approved outcomes. See `docs/case-study-001.md` and `docs/case-study-002.md`. |
| 09 Operations | in_progress | Owner map, deploy runbook, support runbook, watcher queue evidence, backups. |

## Current Internal Artifacts

| Artifact | Path | Status |
|---|---|---|
| Acquisition readiness pack v3 | `docs/ACQUISITION_READINESS_PACK_V3.md` | review_ready |
| Acquirer source validation | `docs/acquirer-source-validation-2026-06-23.md` | review_ready |
| Quality report | `docs/quality-report-2026-06-23.md` | baseline |
| Acquisition metrics | `data/acquisition_readiness_metrics.json` | baseline |
| Platform buyer teaser | `docs/platform-buyer-teaser-2026-06-23.md` | review_ready after proof gate |
| Vertical buyer teaser | `docs/vertical-buyer-teaser-2026-06-23.md` | review_ready after proof gate |
| Buyer pipeline OS | `docs/buyer-pipeline-operating-system-v3.md` | review_ready after proof gate |
| Legal and data room index v3 | `docs/legal-data-room-index-v3.md` | missing stopper docs |
| Data provenance ledger | `docs/data-provenance-ledger.md` | in_progress |
| IP assignment ledger | `docs/ip-assignment-ledger.md` | missing stopper docs |
| Open-source license matrix | `docs/open-source-license-matrix.md` | in_progress |
| Confidence fallback policy | `docs/confidence-fallback-policy.md` | policy review_ready, proof missing |
| Subscription entitlement proof | `docs/subscription-entitlement-proof.md` | in_progress |
| Security posture summary | `docs/security-posture-summary.md` | in_progress |
| COGS and margin model | `docs/cogs-and-margin-model.md` | missing financial inputs |
| Case study 001 | `docs/case-study-001.md` | internal proof only |
| Case study 002 | `docs/case-study-002.md` | internal proof only |
| All-app readiness ledger | `docs/ALL_APP_READINESS_LEDGER.md` | baseline |
| Project health snapshot | `data/project-health.json` | baseline |
| Monetization plan | `data/monetization-plan.json` | baseline |
| Demo video inventory | `data/demo-videos.json` | baseline |

## Next Documents To Create

1. `docs/subscription-lifecycle-implementation.md`
2. `docs/customer-data-deletion-policy.md`
3. `docs/vendor-data-processing-memo.md`
4. `docs/security-incident-register.md`
5. `docs/revenue-and-retention-export.md`
6. `docs/customer-approved-case-study-001.md`

## No-Outreach Gate

No target outreach should start until `data-provenance-ledger.md`, `ip-assignment-ledger.md`, `confidence-fallback-policy.md`, and the first reproducible benchmark report are at least `review_ready`.
