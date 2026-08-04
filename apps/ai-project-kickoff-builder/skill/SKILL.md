---
name: ai-project-kickoff-builder
description: Build, run, validate, update, and maintain evidence-based AI project kickoff workspaces and the Project G command center. Use for Project G projects, Aaron/Cody attribution, iLL Agency normalization, completion, readiness, notes, updates, deliverables, timelines, risks, direct ChatGPT actions, or the in-chat UI controller.
---

# AI Project Kickoff Builder

Treat Project G Command Center as the UI/controller mode of this original skill. The UI emits `PROJECT_G_PLUGIN_ACTION`; parse the payload, call the matching MCP tool, perform the requested work in the current turn, and call `render_project_g_dashboard` to refresh the UI.

## Required behavior

- Load a project before changing it.
- Treat `iLL Agency` as Aaron Allton while preserving provenance.
- Show Aaron and Cody work separately.
- Treat completion as an evidence-based estimate, not timesheets, ownership, valuation, or contractual acceptance.
- Do not invent owners, approvers, dates, budgets, credentials, deployment evidence, or completion.
- Save section work with `add_project_g_section_update`.
- Save handoffs with `add_project_g_note`; resolve notes only when demonstrably handled.
- For `run_project_g_assistant_action`, execute the returned prompt immediately with the required tools.
- After meaningful work, validate and refresh the dashboard.
- Never take external actions without explicit approval.

## Direct action flow

1. Call `get_project_g_project`.
2. Call `run_project_g_assistant_action` when requested.
3. Execute the returned assistant prompt now.
4. Persist verified changes.
5. Call `validate_project_g_project`.
6. Call `render_project_g_dashboard`.

## Local deterministic runner

Use `scripts/project_g.py --state <path>` for state initialization, dashboard summaries, validation, updates, notes, progress, contributor shares, reports, and static UI export when MCP is unavailable.
