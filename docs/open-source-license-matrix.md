# illcoai.tech Open-Source License Matrix

Date: 2026-06-23
Status: in_progress
Owner: owner-admin
Scope: direct dependencies from `package.json`

## Summary

Direct dependency metadata shows MIT and Apache-2.0 licenses only. This is not yet clean because transitive dependencies and bundled assets still need a full scan.

## Direct Dependencies

| Package | Installed version | License | Status |
|---|---:|---|---|
| `@aws/aurora-dsql-node-postgres-connector` | 0.1.9 | Apache-2.0 | review_ready |
| `@modelcontextprotocol/ext-apps` | 1.7.4 | MIT | review_ready |
| `@modelcontextprotocol/sdk` | 1.29.0 | MIT | review_ready |
| `@neondatabase/serverless` | 1.1.0 | MIT | review_ready |
| `@openai/agents` | 0.11.7 | MIT | review_ready |
| `@openai/codex-sdk` | 0.133.0 | Apache-2.0 | review_ready |
| `@types/node` | 24.12.4 | MIT | review_ready |
| `@types/pg` | 8.20.0 | MIT | review_ready |
| `@types/react` | 19.2.15 | MIT | review_ready |
| `@types/react-dom` | 19.2.3 | MIT | review_ready |
| `@vercel/functions` | 3.7.1 | Apache-2.0 | review_ready |
| `@vercel/oidc-aws-credentials-provider` | 3.1.4 | Apache-2.0 | review_ready |
| `next` | 16.2.6 | MIT | review_ready |
| `pg` | 8.21.0 | MIT | review_ready |
| `playwright` | 1.60.0 | Apache-2.0 | review_ready |
| `react` | 19.2.5 | MIT | review_ready |
| `react-dom` | 19.2.5 | MIT | review_ready |
| `stripe` | 22.1.1 | MIT | review_ready |
| `tsx` | 4.22.3 | MIT | review_ready |
| `typescript` | 6.0.3 | Apache-2.0 | review_ready |
| `zod` | 4.4.3 | MIT | review_ready |

## Remaining License Work

| Item | Status | Required action |
|---|---|---|
| Transitive dependencies | missing | Run a full license scan and store output. |
| Generated product images | missing | Add provider/source provenance and usage rights. |
| Demo videos and music clips | missing | Add asset ownership/source ledger. |
| Blog/content sources | missing | Confirm no copied protected text is shipped without rights. |
| External brand references | missing | Confirm nominative use and remove unnecessary marks. |

## Buyer-Safe Statement

Current direct dependency review found MIT and Apache-2.0 licenses. Full license compliance is not clean until transitive dependencies and media assets are reviewed.
