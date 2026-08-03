# Goldstrike Canyon Sprite Atlas

Production-indexed sprite package for the Goldstrike Canyon / Gold Strike Hot Springs world region.

## Installed runtime layer

- 84 transparent sprite frames
- One verified 64 × 84 WebP far-streaming atlas
- Public runtime path: `/world/goldstrike-canyon/sprites/sheets/goldstrike_all_far_lod.webp`
- SHA-256: `2ea4e18b36a96710a385e12d01261a1dfcfb3f71d2ea45d02dc2f022227796a3`
- Git blob SHA-1: `93fa6f13c12c7ed3d9d0590ce8f3ffc422820c2c`
- Linked anchors: `GS-A010`, `GS-A020`, `GS-A030`, `GS-A040`, `GS-A050`

The repository image is deliberately a tiny far-distance LOD for rapid world streaming. Eight full-resolution 1536 × 1024 transparent source sheets are preserved in the separate production asset pack for close rendering, recutting, texture baking and future 3D conversion.

## Runtime rules

1. Use this atlas for distant billboards, minimap markers and unloaded-zone placeholders.
2. Clamp texture sampling to each indexed frame to prevent atlas bleeding.
3. Use the full-resolution source pack or authored 3D geometry for close-range rendering.
4. Large rock and traversal sprites require authored collision proxies; visible alpha is not collision geometry.
5. Decorative marker text is not authoritative UI text. Render verified location labels separately.
6. World placement remains controlled by the Goldstrike geospatial anchor module. Sprite art is not survey geometry.
