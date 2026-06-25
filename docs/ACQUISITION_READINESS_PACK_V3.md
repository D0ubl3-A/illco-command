# illcoai.tech Acquisition Readiness Pack v3

Date: 2026-06-23
Status: Internal diligence dry run
Audience: founder, corp dev lead, legal, product, infra
Public endpoint decision: do not create a public acquisition endpoint in v3. Use `data/acquisition_readiness_metrics.json` and internal docs only.

## Acquisition Thesis

illcoai.tech should be positioned as an AI workflow operating layer for teams that need repeatable output, auditability, and lower manual work per customer. The buyout story is not "AI app." The buyout story is workflow infrastructure that a larger platform can plug into existing customers within 90 days.

## One-Sentence Positioning

illcoai.tech helps operational teams replace repeat manual workflow steps with auditable AI-assisted execution, reducing time-to-output while keeping low-confidence work routed through fallback or human review.

## Current Internal Metrics

Source: `docs/ALL_APP_READINESS_LEDGER.md`, `data/monetization-plan.json`, `data/project-health.json`, `data/demo-videos.json`.

| Metric | Current value | Buyer-safe interpretation |
|---|---:|---|
| Total products in catalog snapshot | 119 | Broad internal workflow inventory exists. |
| Public funnel products | 57 | Public surface is still too broad for outreach. |
| Checkout-allowed products | 47 | There is a monetizable working set, but each must be tied to proof. |
| Checkout-blocked products | 40 | Locked products reduce broken-promise risk if labels stay clear. |
| Manual-review products | 32 | This queue must be reduced or kept request-only. |
| Health-checked products | 119 | Fleet has a measurable health snapshot. |
| Healthy products | 80 | Production footprint is real, but not all healthy apps are buyer-ready. |
| Degraded products | 7 | Needs owner assignment before launch/ad traffic. |
| Offline products | 32 | Must remain hidden, locked, or explicitly coming soon. |
| Demo records | 48 | Proof assets exist for part of the catalog. |
| Uploaded demo videos | 16 | Good starting proof base; insufficient for every paid offer. |
| Uploaded tutorial videos | 3 | Tutorial depth is still thin. |

## Diligence Gate Status

| Area | Status | Stopper? | Required next proof |
|---|---|---:|---|
| Strategic clarity | review_ready | No | Keep one ICP, one workflow, one outcome in every teaser. |
| Product maturity | in_progress | Yes | Prove checkout -> account -> entitlement -> app access for the paid set. |
| AI quality | in_progress | Yes | Publish reproducible benchmark trend, not one static claim. |
| Data provenance | in_progress | Yes | Complete source, permission, retention, deletion, and vendor handling ledger. |
| IP assignment | missing | Yes | Create contributor/IP assignment ledger and isolate uncovered work. |
| Security posture | in_progress | Yes | Complete access-control, secrets, audit-log, and incident-response artifacts. |
| Financial metrics | missing | Usually | COGS/request, gross margin, active subscriptions, retention cohort. |
| GTM proof | in_progress | Usually | Two case studies with before/after/source/approval fields. |
| Legal inventory | in_progress | Yes | Mark each legal document missing, in_progress, review_ready, or clean. |

## What The App Is Still Missing

1. A proven normal-user login path. Admin login is not enough; a buyer and customer need proof that a new customer can sign in, get an active profile, and return to the right product.
2. A proven payment-to-entitlement path. The critical happy path is checkout success, sale confirmation, account subscription display, and unlock of the exact paid product.
3. Subscription lifecycle proof. Create, renew, cancel, expire, and revoke all need evidence. Buyer diligence will look for access that stops when payment stops.
4. Data provenance. A ledger now exists, but retention, deletion, consent basis, and vendor handling still need legal signoff.
5. IP chain-of-title. Outreach should stop until contributor ownership and third-party obligations are inventoried.
6. Quality benchmarks. The app needs reproducible evals for quality, latency, cost, rollback, and drift, with trend comparison across at least two runs.
7. Case studies. The product story needs two approved examples with before, after, metric source, and customer approval state.
8. Product proof coverage. Every paid public offer needs an in-app route, product thumbnail, demo/proof asset, clear delivery promise, and support/escalation path.
9. Admin operations evidence. The watcher/operator panel should show persistent repair requests, owners, status, timestamps, and resolution notes.
10. Buyer data room. Keep internal docs together: legal, security, benchmarks, product metrics, financials, source validation, integration memos, and case studies.

## 90-Minute Sprint

| Task | Owner | Pass condition |
|---|---|---|
| Fill missing live metrics in `data/acquisition_readiness_metrics.json` | owner-analytics | No `missing` field remains for metrics already available in source artifacts. |
| Mark each legal document status | owner-legal | Every legal row is `missing`, `in_progress`, `review_ready`, or `clean`. |
| Attach one source artifact per claim | owner-admin | Each acquirer-facing claim points to a dashboard, contract, case study, benchmark, legal doc, or runbook. |
| Select first 6 targets only after legal gate | owner-strategy | Outreach list stays blocked until IP and data provenance are at least `review_ready`. |
| Publish quality report | owner-ai | `docs/quality-report-2026-06-23.md` exists and uses the quality checklist format. |

## 14-Day Execution Order

| Day | Output | Pass condition |
|---:|---|---|
| 1 | ICP and category locked | One sentence, one buyer category, one painful workflow. |
| 2 | Top 10 acquirers scored | Each row has fit score, 90-day integration path, and top risk. |
| 3 | Remaining 10 acquirers scored | Priority 1-10 set for every row. |
| 4 | Platform teaser and vertical teaser | Both use ROI, risk control, and integration language. |
| 5 | Benchmark report v1 | Quality, latency, cost, rollback, and drift fields present. |
| 6 | Fallback policy | Confidence threshold and escalation route defined. |
| 7 | Legal inventory | Every required document has owner and status. |
| 8 | Critical owner map | Deploy, support, release, data, eval, legal each have backup. |
| 9 | Case study 1 | Before, after, metric source, and approval state present. |
| 10 | Outreach wave 1 | Top 6 messages drafted and reviewed against legal gate. |
| 11 | Case study 2 | Same standard as case study 1. |
| 12 | Mock diligence round | Red/yellow/green status for legal, AI quality, finance, security. |
| 13 | Blocker closure | Red items get 72-hour owner assignment. |
| 14 | Phase review | Proceed only if no stopper risks remain. |

## Stop Rules

- Stop outreach if IP assignment status is `missing`.
- Stop outreach if data provenance status is `missing`.
- Stop outreach if no benchmark report exists.
- Stop outreach if no confidence fallback policy exists.
- Stop outreach if a target has no credible 90-day integration path.
- Stop paid ads to any product whose checkout, account, entitlement, and delivery path has not been tested end to end.

## Evidence Standard

Every acquirer-facing claim must have one proof type: live dashboard, benchmark report, signed agreement, customer reference, security artifact, legal document, source-code reference, or runbook reference.

## Owner Defaults

| Function | Primary | Backup |
|---|---|---|
| Buyer strategy | owner-strategy | owner-sales |
| Product quality | owner-ai | owner-infra |
| Data provenance | owner-legal | owner-admin |
| Security posture | owner-infra | owner-admin |
| Unit economics | owner-analytics | owner-finance |
| Outreach | owner-sales | owner-strategy |

## Launch-First Priority

The fastest credible path is not polishing all 119 products. The path is to lock the catalog around the working set, prove the paid flow, hide or request-gate weak products, and package evidence. A buyer will tolerate an unfinished roadmap. A buyer will not tolerate unsupported claims, unclear IP, unclear data rights, or a paid product that unlocks the wrong thing.
