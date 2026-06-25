# All-App Readiness Ledger

Generated: 2026-06-23T01:42:24.430Z

## Snapshot

- Total products: 119
- Public funnel products: 57
- Working products: 47
- Locked products: 40
- Manual review products: 32
- Products needing demo video: 49
- Proof-ready products: 17
- Checkout-warning products: 0

## Source Freshness

- Monetization snapshot: 2026-06-21T00:43:03.811Z
- Health snapshot: 2026-06-17T03:35:27.512Z
- Demo snapshot: 2026-06-21T07:49:44.973Z

## Health Audit

- Checked: 117
- Healthy: 78
- Degraded: 7
- Offline: 32

## Done Definition

Each product must end in one of two states:

- Working: production URL is healthy, UI is customer-safe, auth/env/payment/access routes pass, proof is ready when required, docs exist, and verification commands pass.
- Locked: checkout and customer access are blocked, the public UI says locked/manual review, and the remediation reason is explicit.

## Top Locked Queue

| Product | Health | Next action |
| --- | --- | --- |
| `aaron` | offline | No production URL assigned. |
| `ai-companion-command-routing` | healthy | Separated AI companion modules stay locked behind the reviewed ILLCO Tools bundle. |
| `ai-companion-content-production` | healthy | Separated AI companion modules stay locked behind the reviewed ILLCO Tools bundle. |
| `ai-companion-conversational-intake` | healthy | Separated AI companion modules stay locked behind the reviewed ILLCO Tools bundle. |
| `ai-companion-prompt-studio` | healthy | Separated AI companion modules stay locked behind the reviewed ILLCO Tools bundle. |
| `ai-companion-sales-agent-handoff` | healthy | Separated AI companion modules stay locked behind the reviewed ILLCO Tools bundle. |
| `ai-companion-workspace-access` | healthy | Separated AI companion modules stay locked behind the reviewed ILLCO Tools bundle. |
| `backend-node` | offline | Latest health audit marked the deployment offline. |
| `barz` | offline | No production URL assigned. |
| `barz-web-studio` | offline | No production URL assigned. |
| `debate-league` | offline | Latest health audit marked the deployment offline. |
| `debate-league-jcld` | offline | Latest health audit marked the deployment offline. |
| `debate-league-t49t` | offline | Latest health audit marked the deployment offline. |
| `debateit` | offline | Latest health audit marked the deployment offline. |
| `epstein-files-desk` | offline | No production URL assigned. |
| `illcoai-airbnb-v2` | offline | Latest health audit marked the deployment offline. |
| `illcoai-api` | offline | Latest health audit marked the deployment offline. |
| `illcoai-book-api-v2` | offline | Latest health audit marked the deployment offline. |
| `illcoai-book-v2` | offline | Latest health audit marked the deployment offline. |
| `illcoai-bot-api-v2` | offline | Latest health audit marked the deployment offline. |

## Top Manual Review Queue

| Product | Health | Next action |
| --- | --- | --- |
| `assets` | healthy | Complete manual review or keep the product request-only. |
| `backend` | healthy | Complete manual review or keep the product request-only. |
| `bigo-live-news` | healthy | Complete manual review or keep the product request-only. |
| `bigostreets` | healthy | Complete manual review or keep the product request-only. |
| `bookie` | degraded | Complete manual review or keep the product request-only. |
| `bri-babyy` | healthy | Complete manual review or keep the product request-only. |
| `brii-baby` | healthy | Complete manual review or keep the product request-only. |
| `cortex-intelligence` | healthy | Complete manual review or keep the product request-only. |
| `debate-league-api` | healthy | Complete manual review or keep the product request-only. |
| `debate-league-pro` | healthy | Complete manual review or keep the product request-only. |
| `diss-track-site` | healthy | Complete manual review or keep the product request-only. |
| `frontend` | degraded | Complete manual review or keep the product request-only. |
| `ghettobirddemo` | healthy | Complete manual review or keep the product request-only. |
| `ilco-ops2` | healthy | Complete manual review or keep the product request-only. |
| `ill-motion-ai` | healthy | Complete manual review or keep the product request-only. |
| `illco-ai-hq` | healthy | Complete manual review or keep the product request-only. |
| `illco-ai-hq-no-mock-data` | healthy | Complete manual review or keep the product request-only. |
| `illcoai-offline-v2` | healthy | Complete manual review or keep the product request-only. |
| `lyric-video-forge` | unknown | Complete manual review or keep the product request-only. |
| `notion-api-webhook-repo` | healthy | Complete manual review or keep the product request-only. |

## Top Demo Queue

Gemini-dependent video work remains paused until explicit owner approval.

| Product | Health | Proof status |
| --- | --- | --- |
| `illcoai-airbnb-v2` | offline | proof needed |
| `illcoai-bot-v2` | offline | proof needed |
| `illcoai-lipsync-v2` | offline | proof needed |
| `illcoai-realtor-workflow-v2` | offline | proof needed |
| `illcoai-tools` | offline | proof needed |
| `ltb-tool-payments` | offline | proof needed |
| `online-store` | degraded | proof needed |
| `real-estate-ai-workstation` | offline | proof needed |
| `whatsapp-bot` | degraded | proof needed |
| `lyric-video-forge` | unknown | proof needed |
| `ai-companions-recovered` | healthy | proof needed |
| `ai-dev-co-funnel` | healthy | proof exists |
| `arc-agentic-commerce-hackathon-2026` | healthy | proof needed |
| `automateflow` | healthy | proof needed |
| `battle-rap-ai` | healthy | proof exists |
| `codex-agent-app` | healthy | proof needed |
| `codexgroq` | healthy | proof exists |
| `gardening-site` | healthy | proof needed |
| `gardening-site-grqp` | healthy | proof needed |
| `ghetto-bird-robot` | healthy | proof needed |

## Current Priority Order

1. Keep all degraded/offline apps locked.
2. Resolve manual-review apps with a real risk/access decision.
3. Add missing proof/tutorial coverage without using Gemini-dependent workflows.
4. Package and document apps that are already healthy.
5. Unlock only after tests, typecheck, build, and health/monetization sync pass.
