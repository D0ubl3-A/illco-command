# ILLCO Command Owner Quick Start

## Current Operating Rule

ILLCO Command is the command center for the monetized app catalog. An app is customer-ready only when it is working end to end or explicitly locked with a clear remediation path.

## Start Here

1. Open the app shell at `/tools` or `/`.
2. Use `/commander` for the customer-facing revenue surface.
3. Use `/admin` only with `ADMIN_API_KEY` configured.
4. Use `/account` to validate account and access flows.
5. Use `/apps/[productId]` to inspect an individual product landing page.

## Required Verification Commands

Run these before treating the suite as ready:

```powershell
npm test
.\node_modules\.bin\tsc.cmd --noEmit
npm run audit:health
npm run monetization:sync
npm run readiness:ledger
npm run build
```

## Sell/Lock Policy

- Working apps may expose open/access paths only when health and production URL gates pass.
- Self-serve checkout additionally requires proof readiness and subscription configuration.
- Degraded, offline, unverified, missing-credential, or placeholder apps must stay locked.
- `allow-checkout-with-warning` should remain at `0`; degraded apps are `block-checkout`.

## Gemini Video Pause

Do not run Gemini-key-dependent demo, tutorial, proof, narration, analysis, upload, or generation work until the owner explicitly approves resuming it. Non-Gemini planning and documentation may continue.

## Codex SDK Access

Codex SDK routes are high-tier only. Agency and Enterprise buyers can be eligible after auth, billing, and entitlement checks pass. Lower tiers, anonymous users, expired purchases, and failed payments remain locked.
