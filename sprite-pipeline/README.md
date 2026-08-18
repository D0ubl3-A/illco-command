# Original Claymation Celebrity-Brawl Parody Sprite Pipeline

Authoritative production coordinates for the Sprite Pipeline to 10K mission.

- Repository: `D0ubl3-A/illco-command`
- Branch: `sprite-pipeline-to-10k`
- Database schema: `sprite-pipeline/state/schema.sql`
- Evidence/archive root: `sprite-pipeline/evidence/`
- Character asset root: `sprite-pipeline/assets/characters/`
- FX/texture asset root: `sprite-pipeline/assets/fx/`
- Runtime config: `sprite-pipeline/config/production.json`

The schema and roots are committed here so future runs have stable coordinates. A runtime must initialize and transact against the database before any asset can be credited beyond planned/queued state. Git files are not themselves evidence that rendering or validation occurred.
