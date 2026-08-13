---
name: sprite-pipeline-to-10k
description: Generate, validate, evidence, and package original claymation celebrity-brawl parody character and FX sprites using the production Sprite Pipeline to 10K controls.
version: 1.0.0
---

# Sprite Pipeline to 10K Skill

## Purpose

Run a truthful production batch for the Original Claymation Celebrity-Brawl Parody theme. The skill creates real PNG assets, validates their decoded pixels, writes content-addressed files, emits hashed evidence, and reports only validated results.

## Non-negotiable truth rules

- Planned and queued entries are never reported as rendered.
- Rendered bytes are never reported as validated until all required pixel and integrity checks pass.
- Validated assets are never reported as packaged or published unless package and publication evidence exists.
- A 10,000/10,000 score is forbidden until every release gate passes on the complete real corpus.
- Any duplicate asset ID, path escape, corrupt image, failed validation, or evidence mismatch fails the run.

## Inputs

The executable accepts:

- `--root`: writable production output root.
- `--run-id`: immutable run identifier.
- `--characters`: number of real character sprites to produce.
- `--fx`: number of real FX sprites to produce.
- `--character-start`: first character numeric ID, default 1.
- `--fx-start`: first FX numeric ID, default 1.

Counts must be positive integers. IDs must remain inside 00001 through 10000.

## Execution contract

1. Validate arguments before creating files.
2. Build deterministic character and FX render requests.
3. Reject duplicate IDs before rendering.
4. Render actual 256×256 RGBA PNG bytes.
5. Decode those PNG bytes.
6. Measure chroma purity, spill, alpha coverage, edge contamination, and clipping.
7. Reject failed outputs without counting them as validated.
8. Store passing files in content-addressed paths using SHA-256.
9. Write one hashed evidence JSON record per validated asset.
10. Write a run summary with exact counts and continuity pointer.
11. Exit nonzero if requested, generated, validated, and stored counts disagree.

## Output layout

```text
<root>/
  objects/<sha-prefix>/<sha256>.png
  evidence/<run-id>/<asset-id>.<evidence-sha256>.json
  runs/<run-id>/summary.json
```

## Character requirements

- Original fictional contestant only.
- Pure chroma-green background.
- No text, logo, watermark, real-person likeness, or protected character.
- Foreground must not touch the frame edge.
- Chroma purity must meet the production threshold.
- Green spill and foreground edge contamination must remain within threshold.

## FX requirements

- Transparent background.
- Nonempty visible alpha bounds.
- Alpha coverage must be greater than zero and below the maximum threshold.
- Visible effect pixels must not touch the frame edge.
- No text, logo, watermark, or protected visual identity.

## Command

```bash
npm run sprite:skill -- \
  --root .sprite-production \
  --run-id clay-brawl-run-0001 \
  --characters 24 \
  --fx 24 \
  --character-start 1 \
  --fx-start 1
```

## Required report

The skill must return:

- Run ID
- Actual requested count
- Actual generated count
- Rendered-unvalidated count
- Validated count
- Rejected count
- Character count
- FX count
- Exact asset IDs
- Object paths
- Evidence paths and hashes
- Continuity pointer
- Summary path

## Failure behavior

The skill fails closed. It does not continue past invalid arguments, duplicate IDs, render corruption, pixel-validation failure, atomic-write failure, or count mismatch.
