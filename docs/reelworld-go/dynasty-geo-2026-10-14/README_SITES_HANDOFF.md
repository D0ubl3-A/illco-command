# ReelWorld GO — Dynasty GEO + Gameplay Patch (Sites Handoff)

**Prepared:** October 14, 2026  
**Target production:** https://reelworld.illcoai.tech/play  
**Status:** Source patch ready for review; **not published**.  
**Baseline used:** Library archive `reelworld-go-tackle-system-source-v3.zip` (files last modified August 29, 2026; package manifest version 1.1.0).  
**IMPORTANT:** Past Sites conversations reported newer live versions (including v106 on September 25). **Never replace or redeploy production from this older archive.** Apply this patch *selectively* to the authoritative current Site project, resolving changes by review.

## What has actually been implemented in the saved source

1. **Geo-authentic fish pools:** Lake Mead and Lake Havasu have explicitly curated fish species rosters with source URLs. Recognized mapped water receives a restricted species picker; unverified local waters remain clearly labeled as simulated ecology. Fish selection never silently spawns a fish excluded by the curated roster. This release covers only four supported species per lake; the rosters are not comprehensive.
2. **GPS accuracy gate:** Mapped water is considered ready only with actual GPS (`status === 'live'`) and reported accuracy of 150 meters or better. A default Las Vegas demo coordinate cannot grant a real-world water-ready state. Camera-based fallback remains subject to existing logic. Physical-device usability still requires testing.
3. **On-screen provenance:** Regional water is labeled `LAKE MEAD · REGIONAL ROSTER` or `LAKE HAVASU · REGIONAL ROSTER`; otherwise gameplay explicitly labels the simulated species pool.
4. **Generative Engine Optimization (GEO):** Metadata and machine-readable `VideoGame` Schema.org JSON-LD were added to the saved HTML entry, with canonical, Open Graph, and Twitter summary fields. This supports AI/search discovery, not guaranteed rankings. The currently deployed /play page might already have equivalent tags; merge without duplicates. Verify canonical routes in the current deployment before applying.

## Evidence and scope

- Nevada Department of Wildlife Lake Mead angler guide, updated October 7, 2026: https://www.ndow.org/waters/lake-mead/
- National Park Service Lake Mead fishing guide: https://home.nps.gov/lake/planyourvisit/fishing.htm
- Lake Havasu visitor bureau species overview: https://www.golakehavasu.com/things-to-do/outdoor-adventures/fishing/
- Arizona Game and Fish Lake Havasu fishery: https://awcs.azgfd.com/conservation-opportunity-areas/aquatic/lake-havasu

These sources describe species occurring within water bodies; they are not real-time fish-location telemetry. The code does not infer access rights or permit eligibility. In-game permits do not replace legal fishing licenses.

## Contents and integration

- `reelworld-geo-upgrade.patch`: Unified diff against the saved source baseline.
- `src/lib/regionEcology.ts`: New regional ecology module.
- `tests/regionEcology.test.mjs`: Standalone deterministic-invariant tests (5,000 regional picks).
- `SITES_TASK_ORDER.md`: Broader rebuild order and required production checks.

For inspection **against the exact old archive only**:

```bash
unzip reelworld-go-tackle-system-source-v3.zip -d staging
cd staging
git apply --check ../reelworld-geo-upgrade.patch
git apply ../reelworld-geo-upgrade.patch
node --experimental-strip-types tests/regionEcology.test.mjs
```

For **current production Sites code**, first pull the latest deployed source, review each hunk, port matching logic, and run full build + end-to-end tests. Do not use `git apply` without verifying source compatibility.

## Verification

- Passed: custom regional ecology simulation, 5,000 casts; original `tests/logic.test.mjs` on saved source; patch round-trip applied cleanly to original saved source and regional tests passed.
- Not verified: TypeScript production build, React render, device/AR camera tests, GPS hardware, payments, live website integration, or deployment. A dependency installation attempt could not complete in the current environment.

## Release gates

- 90% of new testers land first fish in under three minutes.
- No unwanted camera/world movement while reeling in AR and Scenic modes.
- 60 FPS target / stable 30 FPS fallback on selected test devices.
- Regional catches stay in the documented lake's fish pool; unmapped locations do not misrepresent ecology as verified.
- Real permission denial and demo coordinates must not masquerade as genuine GPS.
- Cloud saves, Stripe entitlement fulfillment, and store buttons pass sandbox and controlled production tests, including idempotent webhooks.
- Mobile UI, structured data, canonical URL, social preview, and crawlable public game description are validated after deploy.

## Integration policy

Treat the Sites-hosted latest version as authoritative. Carry forward existing features reported in prior Sites work: AR + Scenic modes, realistic rod, hold-to-reel, fishing meters, animated water, species collections, hunting/duck hunting plans, tactical range plans, trophies, tournaments, saves, checkout. This patch is additive and must not roll any of those systems back. Deploy first to staging or an unpublished Sites version, run tests and review, then publish only after gates pass.