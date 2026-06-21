# ILLCO Marketplace Deploy Recovery

Last updated: June 21, 2026

## Current Source Of Truth

The live `illcoai.tech` site is the Next.js marketplace app in this local workspace:

```text
D:\workspace\illco-command
```

This app contains the `app/`, `components/`, `data/`, `lib/`, `public/`, and `scripts/` directories that power the ILLCO AI marketplace, account center, legal pages, product listings, and app unlock flow.

## Important Repository Mismatch

GitHub `D0ubl3-A/illco-command` currently has a `main` branch shaped like a different API/control-plane app:

```text
api/
src/
public/index.html
public/producer.html
```

That `main` branch is not the Next marketplace app described by the site audit. Do not force-push or merge over it casually unless the intent is to make the Next marketplace app the repository mainline again.

The Next marketplace fixes are preserved on:

```text
branch: illco-command-next-app-fixes
PR: https://github.com/D0ubl3-A/illco-command/pull/1
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

## Verification Commands

Run from `D:\workspace\illco-command`:

```powershell
& "D:/workspace/illco-command/node_modules/.bin/tsc.cmd" --noEmit --pretty false
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

