# illcoai.tech Security Posture Summary

Date: 2026-06-23
Status: in_progress
Owner: owner-infra
Gate: Stopper until reviewed

## Summary

The app has practical security controls for admin access, account sessions, checkout validation, Stripe webhook signing, OAuth state, and lead spam filtering. It is not yet buyer-clean because audit logs, formal incident response, access review exports, and secrets rotation evidence are not packaged.

## Implemented Controls

| Control | Evidence path | Status |
|---|---|---|
| Admin gate supports trusted Google admin or access key | `app/admin/page.tsx`, `app/admin/auth.ts` | in_progress |
| Account session token is hashed before storage | `lib/user-accounts.ts` | review_ready |
| Session cookie is HTTP-only and secure in production | `lib/user-session-cookie.ts`, `app/api/account/session/route.ts` | review_ready |
| Google OAuth validates state and verifier | `app/api/account/google/callback/route.ts`, `lib/google-oauth.ts` | review_ready |
| Return URLs are safety-filtered | `lib/account-return.ts`, `app/api/subscriptions/checkout/route.ts` | review_ready |
| Stripe secret key format is validated | `lib/stripe.ts` | review_ready |
| Production blocks test Stripe secret keys | `lib/stripe.ts` | review_ready |
| Stripe webhook signature is required | `lib/stripe.ts`, `app/api/stripe/webhook/route.ts` | review_ready |
| Checkout only opens public/proof-ready products | `app/api/subscriptions/checkout/route.ts`, `lib/public-checkout.ts` | review_ready |
| Lead honeypot blocks bot submissions | `app/api/leads/route.ts` | review_ready |
| Lead webhook timeout prevents indefinite hanging | `app/api/leads/route.ts` | review_ready |

## Missing Buyer Artifacts

| Artifact | Status | Required content |
|---|---|---|
| Access control export | missing | Admin users, service accounts, roles, least-privilege notes. |
| Secrets management policy | missing | Secret storage, scope, rotation schedule, incident path. |
| Audit log sample | missing | User, workflow, data access, admin action, AI/tool action logs. |
| Incident response policy | missing | Severity levels, owners, comms, postmortem template. |
| Data deletion workflow | missing | Request path, SLA, owner, verification evidence. |
| Security incident register | missing | Known incidents or statement that none are known, with owner signoff. |

## Diligence Position

The codebase shows meaningful security intent, but the company cannot claim enterprise security readiness until access review, audit logging, incident response, and secrets rotation are documented and signed off.
