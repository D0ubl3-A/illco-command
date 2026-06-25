# illcoai.tech Confidence Fallback Policy

Date: 2026-06-23
Status: review_ready as policy, not yet proven by incident evidence
Owner: owner-ai
Gate: Stopper until tested

## Policy

No AI workflow may present uncertain, high-impact, or irreversible output as completed automation. Low-confidence work must route to a fallback model, deterministic template, clarification step, no-action mode, or human review.

## Confidence Bands

| Confidence band | Behavior | User-visible handling | Logging requirement |
|---|---|---|---|
| `>= 0.85` | Execute normal workflow. | Normal completion. | Log workflow, model/prompt version, confidence, output, and action. |
| `0.70-0.84` | Execute only reversible or low-risk step. | Mark as AI-assisted or pending review when applicable. | Log uncertainty reason and review state. |
| `0.50-0.69` | Use deterministic fallback or ask clarifying question. | Do not present task as fully complete. | Log fallback reason and next action. |
| `< 0.50` | No-action mode and escalation. | Explain that review is needed. | Log escalation owner and workflow state. |

## High-Impact Review Rule

Financial, legal, medical, hiring, security, payment, account-access, and irreversible customer communications require human review unless a workflow-specific policy explicitly allows automation with rollback.

## Provider Outage Rule

If a model/tool provider is unavailable:

1. Use cached deterministic mode if it is safe.
2. Pause irreversible actions.
3. Log an incident.
4. Show customer-safe uncertainty copy.
5. Assign owner and close with a regression test.

## Release Gate

No model, prompt, workflow, routing, or tool change ships unless these are complete:

| Gate | Required artifact |
|---|---|
| Golden dataset run | Report with `quality_score`, `false_positive_rate`, `false_negative_rate`, and `drift_score`. |
| Failure sample review | Human review of failures and edge cases. |
| Fallback check | Evidence that low-confidence cases route correctly. |
| Rollback path | Owner and action for reverting the change. |
| Owner signoff | Named owner, date, and changed scope. |

## Incident Closure

Every incident requires owner, cause, customer impact, mitigation, regression test, and close date.

## Evidence Still Needed

This policy is not fully buyer-ready until at least one test run or incident drill proves confidence routing, fallback behavior, logging, and closure.
