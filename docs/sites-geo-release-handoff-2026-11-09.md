# @Sites / iLLCo-AI GEO Release Handoff — November 9, 2026

## Scope and ownership
- Preserve **illcoai.tech** as the technical/product/demos domain.
- Preserve **illcoai.com** as the separate commercial/service/sales domain.
- Preserve the existing iLLCo-AI branding, product catalog, account access, ChatGPT authorization, one-time Lyric Video Forge $10 payment and paid MP4 delivery path.
- Do not replace the production site from a repository or Sites source whose commit/version does not match the current authoritative deployment.
- No permission to make a live transaction or silently change product prices, subscriptions, Stripe accounts or public site audience.

## Verified starting baseline
Public GitHub Actions run [geo-production-evidence](https://github.com/D0ubl3-A/illco-command/actions/runs/42753502042) observed:
- `https://illcoai.tech/` HTTP 200 and correct apex self-canonical.
- `https://illcoai.tech/products/lyric-video-forge` HTTP 200 and correct product self-canonical.
- Public price of $10 per successful render on product page.
- `https://illcoai.tech/checkout/lyric-video-forge` HTTP 200 (checkout entry **only**; not paid fulfillment).
- `https://illcoai.tech/verification`, `/robots.txt` and `/sitemap.xml` HTTP 200.
- `https://illcoai.com/` HTTP 200, preserving separate site identity.
- Live `https://www.illcoai.tech/` could not be fetched; status **BLOCKED**, not failed or passed.
- LVF verification still displayed August 19, 2026 "DEGRADED" record; **PARTIAL** freshness, not evidence of current failure.

Read-only Stripe verification found an active $10 USD one-time Lyric Video Forge product and active payment link. It did **not** establish payment->credit->MP4 delivery. Do not claim fulfillment verified.

## @Sites action plan (apply to authoritative, matching live project only)
1. Locate the existing @Sites project whose deployed URL maps to `illcoai.tech`. Record its **project ID, audience setting, source version, and deployment ID**. If no authorized @Sites tool/site source is available, mark **BLOCKED** rather than recreating a similarly named site.
2. Compare its current page inventory with the authoritative public site and linked GitHub production deployment. Preserve `/products/lyric-video-forge`, `/checkout/lyric-video-forge`, `/verification`, `/credits`, `/robots.txt`, `/sitemap.xml`, all product pages, signup/auth and existing checkout routes. The GitHub `main` branch presently differs materially from live routes; no direct overwrite.
3. Verify at the domain/edge layer that `www.illcoai.tech` returns a single 301 or 308 redirect to the apex for each tested path, with valid TLS and no redirect loop. Do not assume the Next.js rule applies if another deployment serves the hostname.
4. Verify self-canonical URLs for every indexable apex page and retain distinct canonicals for `illcoai.com`.
5. Update the LVF verification status **only** after a dated end-to-end test: authorized customer -> test-mode purchase event -> signed webhook -> exactly one credit -> approved audio/captions -> audible nonblank MP4 -> download and recovery tests. Keep historical degraded results as an explicitly dated record; do not erase evidence.
6. Retest all in-scope internal links and checkout CTAs before and after. Reject any changes that break the direct paid path or change prices or authorization gates.
7. Store actual HTTP traces, schema validator output, mobile performance results, signed test event IDs (without secrets/customer PII), and MP4 checksum in evidence ledger. Update status only when evidence meets full acceptance criteria.
8. For keyword/AI rankings, obtain Google Search Console and comparable fixed-geo SERP samples. Label other terms "TARGETING OPPORTUNITY", not measured win/loss.

## Validation and rollback
- Run `node scripts/verify-live-geo.mjs --out=artifacts/geo-live.json` against the live deployment, or inspect GitHub Actions `Read-only production GEO evidence`.
- Run `npm test`, typecheck and `npm run build` for any source changes.
- Verify the `Sites Green-100 Verification` workflow. Its name describes a CI workflow, **not** evidence that the @Sites application is connected or that the production site was deployed.
- Save the old version/release reference. If any checkout, authentication, canonical, routes or product status regress, revert the affected change.

## Current acceptance summary
| Gate | Result |
|---|---|
| Apex homepage / product self canonical | PASS (public read-only probe) |
| Product price / Stripe live configuration | PASS (read-only) |
| `www` permanent redirect | BLOCKED (fetch failed) |
| Authenticated checkout payment / durable credits / MP4 | NOT VERIFIED |
| LVF product verification freshness | PARTIAL (historical dated degraded record) |
| Site source/deployment identity parity | BLOCKED until @Sites and Vercel source are reconciled |
| Measured Google keyword ranking | NOT VERIFIED |

Related tracking: [#58](https://github.com/D0ubl3-A/illco-command/issues/58), [#59](https://github.com/D0ubl3-A/illco-command/issues/59), [PR #60](https://github.com/D0ubl3-A/illco-command/pull/60).

**Production rule:** No merger/automatic deployment until the exact authoritative source and release pipeline are confirmed and regression tests pass.
