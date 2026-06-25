# illcoai.tech Data Provenance Ledger

Date: 2026-06-23
Status: in_progress
Owner: owner-legal
Gate: Stopper until `review_ready`

## Decision

Data provenance is not clean yet. The application has identifiable data stores and code paths, but buyer outreach should remain blocked until retention, deletion, consent basis, and vendor handling are formally approved.

## Data Inventory

| Data category | Source | Purpose | Storage / artifact | Current evidence | Status |
|---|---|---|---|---|---|
| User profile | Email/password signup or Google OAuth | Account identity, subscription display, product access | `illco_command_users` | `lib/account-schema.ts`, `lib/user-accounts.ts`, `app/api/account/google/callback/route.ts` | in_progress |
| User session | App-generated browser session token | Authenticated account access | `illco_command_user_sessions` with hashed session token | `lib/account-schema.ts`, `lib/user-accounts.ts` | in_progress |
| Google OAuth profile | Google OAuth callback | Account creation/linking | email, name, Google subject, avatar URL | `app/api/account/google/callback/route.ts`, `lib/user-accounts.ts` | in_progress |
| Checkout session | Stripe Checkout | Payment routing, purchase record, entitlement display | `illco_command_checkout_sessions` | `app/api/subscriptions/checkout/route.ts`, `lib/checkout-store.ts`, `app/api/stripe/webhook/route.ts` | in_progress |
| Stripe customer/session payload | Stripe webhook | Payment completion proof and billing portal access | `raw_payload` JSONB in checkout sessions | `app/api/stripe/webhook/route.ts`, `lib/checkout-store.ts` | in_progress |
| Lead request | Public request forms | Sales follow-up and admin notification | database via `recordLead`, spreadsheet webhook, admin webhook | `app/api/leads/route.ts`, `lib/env.ts` | in_progress |
| Product health | Internal audits | Catalog gating and readiness reporting | `data/project-health.json` | `scripts/audit-project-health.ts`, `docs/ALL_APP_READINESS_LEDGER.md` | review_ready |
| Monetization plan | Internal sync script | Product checkout gating and plan mapping | `data/monetization-plan.json` | `scripts/sync-monetization-plan.ts`, `lib/monetization.ts` | review_ready |
| Demo/proof assets | Internal recording/upload workflows | Proof videos and product demos | `data/demo-videos.json`, local/video URLs | `scripts/record-demo-videos.ts`, `scripts/upload-demo-videos.ts` | in_progress |
| Acquisition metrics | Internal diligence rollup | Buyer-readiness reporting | `data/acquisition_readiness_metrics.json` | `docs/ACQUISITION_READINESS_PACK_V3.md` | review_ready |

## Consent And Lawful Basis Matrix

| Data category | Current basis | Missing approval |
|---|---|---|
| User account data | User creates account or signs in with Google | Legal review of privacy text and data retention period. |
| OAuth profile data | OAuth consent during Google sign-in | Confirm OAuth scopes and production redirect configuration. |
| Checkout/session data | Customer initiates checkout through Stripe | Confirm Stripe DPA/vendor terms and webhook retention period. |
| Leads | User submits a request form | Confirm marketing/contact consent language and unsubscribe handling. |
| Product health/demo metadata | Internal operational metadata | Confirm no customer secrets are included in artifacts. |

## Retention And Deletion

| Item | Current state | Required fix |
|---|---|---|
| User deletion | Not packaged as a buyer-ready process. | Create deletion request process, SLA, owner, and verification log. |
| Checkout records | Stored in app database when database is configured. | Define retention period and deletion/anonymization behavior. |
| Lead records | Stored in DB and/or webhooks when configured. | Define retention period, owner, and suppression/unsubscribe rules. |
| OAuth profile | Stored for account identity. | Define deletion behavior when user account is deleted. |
| Raw Stripe payload | Stored as JSONB on completion. | Minimize payload or document retention/security basis. |

## Stopper Gaps

1. No approved retention/deletion policy is attached.
2. No consent/lawful basis matrix has legal signoff.
3. No vendor handling memo exists for Stripe, Google, OpenAI/Groq, Vercel, database, or webhook targets.
4. No customer-data training policy is attached.

## Review-Ready Conditions

This ledger becomes `review_ready` when every data category has source, purpose, storage, retention, deletion route, owner, and vendor handling documented.
