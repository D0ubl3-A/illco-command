# illcoai.tech Legal and Data Room Index v3

Date: 2026-06-23
Status: internal diligence tracker

## Status Values

Use only `missing`, `in_progress`, `review_ready`, or `clean`.

## Required Documents

| Document | Owner | Status | Version | Gate |
|---|---|---|---|---|
| Certificate of incorporation | owner-legal | missing | v1 | Stopper |
| Current cap table | owner-legal | missing | v1 | Stopper |
| Founder IP assignment | owner-legal | missing | v1 | Stopper |
| Contractor IP assignments | owner-legal | missing | v1 | Stopper |
| Employee invention assignment | owner-legal | missing | v1 | Stopper |
| Data provenance ledger | owner-legal | in_progress | v1 | Stopper |
| Consent and lawful basis matrix | owner-legal | in_progress | v1 | Stopper |
| Third-party model and tool license audit | owner-admin | in_progress | v1 | Stopper |
| Customer contract archive | owner-legal | missing | v1 | Review |
| Privacy policy and retention policy | owner-legal | missing | v1 | Stopper |
| Security controls summary | owner-infra | in_progress | v1 | Stopper |
| SSO, RBAC, and audit log evidence | owner-infra | missing | v1 | Review |
| Incident response policy and logs | owner-admin | in_progress | v1 | Review |
| Financial statements and liabilities summary | owner-finance | missing | v1 | Stopper |

## Gate Rules

- `Stopper` documents must be at least `review_ready` before active buyer outreach.
- `Review` documents can be `in_progress` during warm intro work.
- Any document marked `clean` needs owner, date, version, and file location.

## Mock Diligence Questions

- Who owns every line of code and every training/evaluation dataset?
- Which customer data is processed, stored, retained, or deleted?
- Which AI providers, models, libraries, and datasets have license restrictions?
- How are low-confidence outputs handled?
- What controls exist for admin access, customer data access, and audit logs?
- What customer contracts create refund, exclusivity, SLA, or liability exposure?

## Red Response Rule

Any red blocker gets a 72-hour correction owner. If it cannot be fixed in 72 hours, create an exception memo before outreach.
