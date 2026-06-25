# illcoai.tech Subscription Entitlement Proof

Date: 2026-06-23
Status: in_progress
Owner: owner-infra

## Executive Result

The codebase has subscription checkout, checkout session persistence, account profile display, and launch gating. It does not yet prove the full lifecycle needed for diligence: purchase, renewal, cancellation, expiration, revocation, and account-level subscription display from a live Stripe event.

## Implemented Evidence

| Capability | Evidence path | Status |
|---|---|---|
| Public checkout route | `app/api/subscriptions/checkout/route.ts` | review_ready |
| Stripe checkout session creation | `lib/stripe.ts` | review_ready |
| Checkout session database persistence | `lib/checkout-store.ts` | review_ready |
| Stripe webhook signature verification | `lib/stripe.ts` | review_ready |
| Checkout completion webhook handling | `app/api/stripe/webhook/route.ts` | review_ready |
| User account schema | `lib/account-schema.ts` | review_ready |
| User account purchase listing | `lib/user-accounts.ts` | review_ready |
| Account session/profile response | `app/api/account/session/route.ts` | review_ready |
| Product launch gating | `lib/public-checkout.ts`, `lib/launch-access.ts` | review_ready |
| Product cards route to in-app modules first | `components/checkout-products-section.tsx` | review_ready |
| Billing portal session | `app/api/subscriptions/portal/route.ts`, `app/api/subscriptions/portal/customer/route.ts` | in_progress |

## Live Proof Checklist

| Flow | Status | Evidence required |
|---|---|---|
| New user signs in with Google | missing | Screenshot/log showing active profile from `/api/account/session`. |
| User starts checkout for one product | missing | Stripe checkout session id and redirect proof. |
| Stripe success returns to account | missing | Account URL includes checkout success and product id. |
| Webhook stores completed checkout | missing | Database row for `illco_command_checkout_sessions`. |
| Account shows subscription/product access | missing | `/api/account/session` purchase record with `launchEnabled: true`. |
| User opens unlocked product | missing | Product route screenshot/log after purchase. |
| User cancels subscription | missing | Stripe portal event and local access update. |
| Access revokes after cancellation/expiration | missing | Account session shows revoked/disabled access. |

## Current Gap

`app/api/stripe/webhook/route.ts` persists checkout completion events, but it does not process `customer.subscription.updated`, `customer.subscription.deleted`, invoice failures, or access revocation. Until subscription lifecycle events are stored and enforced, buyer diligence should treat entitlement lifecycle as incomplete.

## Required Fix

Add a subscription status table or extend checkout session storage so Stripe subscription id, customer id, product id, plan id, status, current period, cancel_at_period_end, and latest invoice state are stored. Then update account access to read active subscription state instead of relying only on checkout completion.
