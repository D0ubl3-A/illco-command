# Pitch 4 — ILLCO Tools (ai-companions-recovered)

## 1) Final pitch (ready to paste)
**Headline:**
**ILLCO Tools: one working AI command surface for creators, agencies, and operators.**

**Subheadline:**
Buy tested AI modules with proof first, then unlock full product usage with a clear, low-friction setup flow.

**What it solves:**
- Too many disconnected tools and no unified workflow control.
- No reliable proof before buying.
- Friction between demo, trial, checkout, and access.

**What works today:**
- Working landing + app listing for `ai-companions-recovered` (public funnel route).
- Full health gate + monetization checks are already in place.
- Proof-first UX is live with live demo/tour outputs.

**Positioning:**
- **For:** teams that need reliable AI operations, not demos.
- **Outcome:** faster setup, predictable access, and proof-led buying.

**Offer (Pitch-ready):**
1. Show proof video.
2. Show module status + proof indicator.
3. Offer guided subscription start or request setup based on gate state.

**Single-line pitch:**
"ILLCO Tools gives you a tested AI command workspace with proof-first product entry, so you can onboard what works and avoid expensive experimentation."

## 2) Live demo output generated in this run
- **Product ID:** `ai-companions-recovered`
- **Demo recording (.webm):** `D:\workspace\illco-command\artifacts\demo-videos\ai-companions-recovered.webm`
- **Tutorial recording (.mp4):** `D:\workspace\illco-command\artifacts\tutorial-videos\ai-companions-recovered\ai-companions-recovered.tutorial.mp4`
- **Tutorial transcript:** `D:\workspace\illco-command\artifacts\tutorial-videos\ai-companions-recovered\ai-companions-recovered.narration.txt`
- **Tutorial captions:** `D:\workspace\illco-command\artifacts\tutorial-videos\ai-companions-recovered\ai-companions-recovered.captions.srt`
- **Manifest:** `D:\workspace\illco-command\artifacts\tutorial-videos\ai-companions-recovered\ai-companions-recovered.tutorial.json`
- **Recorded status (from snapshot):**
  - demo bytes: `1953802`
  - tutorial duration: `142s`
  - captions/narration/highlights: `true`
  - pacing: `slow`
  - scenes: `5`

## 3) Exact execution used
- `npm run proof:record -- --project-ids=ai-companions-recovered --force`
- `npm run tutorial:record -- --force` with env `TUTORIAL_PROJECT_IDS=ai-companions-recovered`

## 4) CTA map + button/function audit (every UI/button hit, auto-generated)
- **Audit file:** `artifacts/ui-button-and-function-audit.md`
- **Match count in app/ + components/:**
  - button hits: `43`
  - anchor button-class hits: `78`
  - function declaration hits: `196` (including `export` functions)

## 5) Top buyer-facing button actions for this product path
- Open app landing:
  - `/apps/ai-companions-recovered` (landing page)
- Start checkout / trial:
  - `/api/subscriptions/checkout` form on landing/product cards
- View proof/tour:
  - module-specific tutorial/proof link from `getPrimaryAppVideo`
- Request setup:
  - in-page `#request` forms and lead capture sections

## 6) Use this as ad creative text
**Short ad copy (20-30 sec):**
"Stop wasting money on AI tools that never prove value. ILLCO Tools shows working proof first, then unlocks your path cleanly with guided access and direct checkout when ready."

**Longer ad copy (video VO):**
"Most AI platforms promise everything and deliver complexity. ILLCO Tools keeps it simple: real proof, clear funnel status, and fast setup paths. Open the module, review proof, and buy what is already passing health and access checks."
