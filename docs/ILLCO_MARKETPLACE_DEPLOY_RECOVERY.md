# ILLCO Marketplace Deploy Recovery

Last updated: June 21, 2026

## Current Source Of Truth

The live `illcoai.tech` site is the Next.js marketplace app in this local workspace:

```text
D:\workspace\illco-command
```

This app contains the `app/`, `components/`, `data/`, `lib/`, `public/`, and `scripts/` directories that power the ILLCO AI marketplace, account center, legal pages, product listings, and app unlock flow.

## GitHub Repository State

GitHub `D0ubl3-A/illco-command` `main` has been synced back to the Next marketplace app without force-pushing. The merge commit preserves the older API/control-plane history, but the current `main` tree is the marketplace app from:

```text
D:\workspace\illco-command
```

Current GitHub deployment source commit:

```text
d0f7951 chore: add master agent live verifier
```

## Fixes Already Made On The Next Marketplace Branch

- `illcoai.tech` health recovered from the reported 502 state.
- Public `Admin Login` navigation is hidden unless the signed-in user is admin.
- Google OAuth normalizes to the canonical callback:

```text
https://illcoai.tech/api/account/google/callback
```

- Privacy, Terms, Refunds, Accessibility, and Cookie pages exist and are linked globally.
- Skip-link and visible focus styling were added.
- Setup and coming-soon checkout product cards now stay inside the ILLCO app funnel:

```text
/apps/{productId}
/apps/{productId}#request
```

Instead of sending users directly to external Vercel app URLs before unlock/readiness gates are met.
- `/master-agent` and `/api/master-agent` exist in source and route users across every app and checkout offer through the same gate rules.
- `GET /api/master-agent?catalog=all` returns the full master-agent catalog.

## Current Deployment Blocker

As of June 21, 2026 at 09:21 PT, the source is ready but `https://illco-command.vercel.app` is still serving an older deployment:

```text
curl.exe -I https://illco-command.vercel.app/master-agent
HTTP/1.1 404 Not Found
```

GitHub has no Vercel deployment records or check runs for the current `main` commit:

```text
gh api repos/D0ubl3-A/illco-command/commits/d0f7951/status
state: pending
total_count: 0
```

Local Vercel CLI auth is also missing:

```text
vercel whoami
Error: No existing credentials found. Please run `vercel login` or pass "--token"
```

This means the remaining deployment issue is external to the code: either restore Vercel CLI auth with a token/login, or reconnect the Vercel project Git integration so pushes to `D0ubl3-A/illco-command` `main` trigger builds.

A manual GitHub Actions deploy path now exists at:

```text
.github/workflows/vercel-production.yml
```

It requires these repository secrets before it can deploy:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

## Verification Commands

Run from `D:\workspace\illco-command`:

```powershell
& "D:/workspace/illco-command/node_modules/.bin/tsc.cmd" --noEmit --pretty false
& "D:/workspace/illco-command/node_modules/.bin/tsx.cmd" --test tests/*.test.ts
$env:NODE_OPTIONS='--max-old-space-size=4096'; npm run build
& "D:/workspace/illco-command/node_modules/.bin/tsx.cmd" scripts/verify-master-agent-live.ts https://illco-command.vercel.app
curl.exe -I --max-time 20 https://illcoai.tech
curl.exe -I --max-time 20 https://illcoai.tech/account
curl.exe -I --max-time 20 https://illcoai.tech/privacy
curl.exe -I --max-time 20 https://illcoai.tech/refunds
curl.exe -I --max-time 20 https://illcoai.tech/api/account/google/start
```

Expected current evidence:

- `https://illcoai.tech` returns `200 OK`.
- `/account` returns `200 OK`.
- `/privacy` and `/refunds` return `200 OK`.
- OAuth start returns `307` to Google with `redirect_uri=https://illcoai.tech/api/account/google/callback`.
- TypeScript returns exit code `0`.
- Full test suite returns `39/39` passing.
- Production build includes `/master-agent` and `/api/master-agent`.
- The live verifier should return JSON with `ok: true`, `catalogItems`, and `offers` after Vercel is deploying the current commit.

## Deployment Steps

Vercel CLI auth must be restored first:

```powershell
vercel login
vercel whoami
```

Then deploy the Next marketplace app from the local D: workspace:

```powershell
cd D:\workspace\illco-command
vercel --prod --yes
```

If using a non-interactive token:

```powershell
cd D:\workspace\illco-command
vercel --prod --yes --token $env:VERCEL_TOKEN
```

Or use GitHub Actions after adding the required repository secrets:

```text
GitHub -> D0ubl3-A/illco-command -> Actions -> Deploy ILLCO Command to Vercel -> Run workflow
```

Do not overwrite Stripe keys or shared production secrets. Vercel production env should remain the source of truth for live secrets.

## Google OAuth Requirement

Google Cloud Console must include this authorized redirect URI:

```text
https://illcoai.tech/api/account/google/callback
```

The legacy callback route still exists in code for compatibility, but the canonical account login flow uses `/api/account/google/callback`.

## Release Gate

Before running ads, production should pass:

- Domain health: `illcoai.tech` and `illco-command.vercel.app` return `200`.
- OAuth start uses the canonical callback.
- Legal footer pages return `200`.
- Coming-soon/setup products do not open external product apps directly.
- Checkout appears only for products with passing proof/readiness/payment gates.
- `tsc --noEmit --pretty false` passes.
