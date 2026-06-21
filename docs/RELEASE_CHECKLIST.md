# Release Checklist

## Verification

- [ ] `npm test` passes.
- [ ] `.\node_modules\.bin\tsc.cmd --noEmit` passes.
- [ ] `npm run audit:health` completes.
- [ ] `npm run monetization:sync` completes.
- [ ] `npm run readiness:ledger` completes.
- [ ] `npm run build` completes.
- [ ] `data/monetization-plan.json` has `allow-checkout-with-warning: 0`.
- [ ] `artifacts/readiness-ledger.json` shows every product as working, locked, or manual review.

## Revenue Readiness

- [ ] Stripe checkout is configured for active plans.
- [ ] Product-plan mismatches are blocked.
- [ ] Non-public products return direct-checkout blocks.
- [ ] Health-gated products return direct-checkout blocks.
- [ ] Products missing proof readiness return checkout blocks.
- [ ] Post-purchase product routes resolve to a real working route or command-center fallback.

## Access And Security

- [ ] Admin routes require the configured admin secret.
- [ ] Account access uses the real account/session flow.
- [ ] License issuing and validation use product-bound signed grants.
- [ ] Codex SDK access remains high-tier only.
- [ ] Missing credentials show locked/remediation states, not fake success.

## Media And Demos

- [ ] Non-Gemini demo work is paced, captioned, narrated, and feature-complete.
- [ ] Gemini-dependent demo/video work is queued, not run.
- [ ] Result-proof apps show output proof, not just route proof.

## Final Ship Gate

Release only when every app is either working or locked with remediation, and the verification commands above pass in the deployment root.
