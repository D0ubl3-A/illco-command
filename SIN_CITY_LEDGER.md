# Sin City authoritative ledger pointer

The single authoritative completed-section ledger for Sin City / JC the Holy OG map production is:

`operations/sin-city/project-workspace.json`

## Required read-before-write rule

Every map-production run must fetch that exact file from the current default branch before selecting or registering any section. The ledger's current `continuity_pointer`, `registered_count`, `registered_range`, `latest_batch_manifest`, evidence receipts, validation fields, production gates, and production authorization are the source of truth.

Do not use a hard-coded continuity pointer from an older prompt, chat message, report, manifest, cache, or local copy when it conflicts with the current ledger. Do not infer progress from a batch plan or registration request. If the ledger cannot be fetched and verified, fail closed and perform no section mutation.

Before a write, verify the next batch is exactly the next 20 unregistered row-major sections, is disjoint from the prior ledger, is within the 35x35 EPSG:32611 grid, and preserves all evidence and production gates. After a write, re-fetch the ledger and verify the new durable state before reporting progress.

Registration is control geometry only and is never production completion. Production authorization remains fail-closed unless every required evidence and QA gate actually passes.
