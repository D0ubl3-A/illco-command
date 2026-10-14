# ReelWorld GO — Sites Dynasty Rebuild execution order

## Release 1: geographic and AI discovery foundations

1. Recover the **actual current Sites project source** mapped to `reelworld.illcoai.tech` (historical conversation pointed to `site/apps/reelworld-go`, but that path wasn't present in connected GitHub).
2. Merge and test the regional species selector from the companion patch into the production species catalog, expanding the verified rosters carefully using state wildlife data. The archived source includes nine fish; previous Sites conversations reported forty-one by September 19, so adapt IDs/mapping rather than overwrite the catalog.
3. Fix misleading camera/scenic messaging: camera is optional for Scenic; camera access is permission-gated for AR; GPS is optional only when mode allows it; show safe fallback.
4. Add server-rendered or statically rendered crawlable text on the **public landing page**, plus accurate `VideoGame` structured data, accessible FAQ, self-describing OG image, canonical, and sitemap. Do not rely solely on JavaScript gameplay or invisible tags. Avoid fake reviews, unsupported claims, artificial SEO padding, and unverifiable ratings.
5. Test one Lake Mead player, one Lake Havasu player, one unsupported lake, one GPS-denied player, and one user with low GPS accuracy. Verify all four outcomes are clearly labeled.

## Release 2: flagship fishing feel

- Guide first player through rod → cast → bite → hold-to-reel → controlled drag → visible fish splash → catch → trophy, one action per screen.
- Preserve stable world anchoring in AR; player motion moves the rod, not the background.
- Display line, line angle, tension, fish stamina, reel progress; support left/right-handed mode, touch, phone motion, and scenic mode.
- Physical-device benchmarks and deterministic replay tests before release.

## Release 3: hunting and long-term dynasty

- Hunting scale/distance and environmental occlusion, point-to-aim / tap-to-fire, animal awareness, collapsing/fleeing outcomes, safety notices.
- Duck hunting and tactical range only after core hunting is stable.
- Regional tournaments, trophy journal, seasons, referrals, cosmetic commerce (not pay-to-win).

## Production safety

Do not overwrite current Sites project with saved July/August source archive. Do not claim features are deployed until site write/publish actions and smoke tests confirm success. Do not expose payment credentials, API keys, or exact sensitive GPS location in marketing analytics.