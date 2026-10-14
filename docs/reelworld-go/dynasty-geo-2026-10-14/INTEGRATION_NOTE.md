# GitHub staging for ReelWorld GO Dynasty GEO patch

The source archive patch is against `reelworld-go-tackle-system-source-v3.zip` (August 29, 2026). This is not the current deployed game.

## Confirmed repository references (Oct 14, 2026)

- Repository: `D0ubl3-A/illco-command`
- Existing ReelWorld route: `app/apps/reelworld-go/page.tsx`
- Existing ReelWorld styles: `app/apps/reelworld-go/reelworld.module.css`
- Existing fish sprite asset: `public/reelworld-go/fish-atlas.svg`
- Live game target reported in prior work: `https://reelworld.illcoai.tech/play`, deployment linkage *not verified*.

## Integration warning

This patch **cannot** be directly applied to `app/apps/reelworld-go/page.tsx`: it refers to files and types in a different archived app (`src/App.tsx`, `src/data/fish.ts`). Keep all patch files in this staging folder as review-only source assets until the live Sites source is recovered and the changes are manually ported and tested.

The documented regional rosters cover only four fish per lake; expand when validating the current catalog. Do not claim the game is deployed, GPS location is verified on-device, or SEO ranking is guaranteed.