# illcoai.tech IP Assignment Ledger

Date: 2026-06-23
Status: missing
Owner: owner-legal
Gate: Stopper

## Decision

Buyer outreach is blocked until IP chain-of-title is documented. The repo contains source code and generated product artifacts, but this file does not yet prove who assigned ownership of each contribution to the company.

## Required Assignments

| Assignment | Owner | Status | Evidence location | Gate |
|---|---|---|---|---|
| Founder IP assignment | owner-legal | missing | TBD signed agreement | Stopper |
| Contractor IP assignments | owner-legal | missing | TBD signed agreements | Stopper |
| Employee invention assignment | owner-legal | missing | TBD signed agreement | Stopper |
| Advisor contribution assignment | owner-legal | missing | TBD signed agreement or waiver | Review |
| Open-source license matrix | owner-admin | in_progress | `docs/open-source-license-matrix.md` | Stopper |
| Generated media rights memo | owner-legal | missing | TBD asset ledger and provider terms | Stopper |
| Domain ownership proof | owner-admin | missing | TBD registrar export | Review |
| Trademark search | owner-legal | missing | TBD search memo | Review |

## Contributor Ledger

| Contributor | Contribution type | Status | Required evidence |
|---|---|---|---|
| Founder | Product direction, source code, copy, media assets | missing | Signed founder IP assignment. |
| Contractors | Unknown | missing | Contributor list and signed contractor IP assignment for each person. |
| Employees | Unknown | missing | Employee invention assignment or confirmation none exist. |
| AI-generated assets | Product images, copy, code assistance | in_progress | Provider terms memo and asset provenance ledger. |
| Open-source packages | Runtime and tooling dependencies | in_progress | Direct and transitive license audit. |

## Source Code Scope

Primary repo under review: `D:\workspace\illco-command`.

Current evidence proves code location, not legal ownership. Diligence requires signed documents, not only Git history.

## Stopper Rule

If any production code, product image, demo video, customer-facing copy, or dataset was created by a person or service without documented assignment/license rights, mark it red and either obtain paperwork or remove/isolate the contribution.
