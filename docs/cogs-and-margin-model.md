# illcoai.tech COGS And Margin Model

Date: 2026-06-23
Status: missing financial inputs
Owner: owner-finance
Gate: Stopper for serious buyer diligence

## Decision

No revenue, cost, gross margin, retention, or CAC claim should be sent to buyers until the missing inputs below are filled from Stripe, hosting, model-provider, database, support, and labor records.

## Required Metrics

| Metric | Formula | Source needed | Status |
|---|---|---|---|
| Revenue | subscription revenue + one-time product revenue | Stripe export | missing |
| Model cost | OpenAI/Groq/other model charges by request | Provider billing export | missing |
| Tool/API cost | third-party API usage tied to workflow | Vendor billing export | missing |
| Infra cost | Vercel + database + storage + queues | Vendor billing export | missing |
| Human review cost | review minutes * loaded hourly cost | Support/ops time log | missing |
| COGS/request | model + tool + infra + human review per completed request | Unified cost ledger | missing |
| Gross margin | revenue - COGS | Financial model | missing |
| Gross margin percent | `(revenue - COGS) / revenue` | Financial model | missing |
| Retention | active paid users retained by cohort | Stripe + account session data | missing |
| CAC payback | acquisition spend / gross margin from acquired customers | Ads/spend + Stripe | missing |

## Product Snapshot Inputs Already Available

| Input | Value | Source |
|---|---:|---|
| Catalog products | 119 | `data/acquisition_readiness_metrics.json` |
| Checkout-allowed products | 47 | `data/acquisition_readiness_metrics.json` |
| Public funnel products | 57 | `data/acquisition_readiness_metrics.json` |
| Uploaded demo videos | 16 | `data/acquisition_readiness_metrics.json` |

## Buyer-Safe Statement

The product has a mapped checkout/product inventory, but financial diligence is not ready until Stripe revenue, provider cost, infrastructure cost, and support cost are reconciled into COGS/request and gross margin.
