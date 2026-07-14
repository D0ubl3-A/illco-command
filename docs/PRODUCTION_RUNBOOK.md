# ILLCO Command production runbook

## Canonical domain

- Public canonical host: `https://illcoai.tech`
- `https://www.illcoai.tech/:path*` must permanently redirect to `https://illcoai.tech/:path*`.
- Keep email-related MX, SPF, DKIM, and DMARC records intact during DNS changes.

## Required production checks

Run these after every production deployment:

1. `/` returns a successful response.
2. `/brain` renders the private sign-in or authorized Brain OS workspace instead of a server error.
3. `/tools/lyric-video-forge` renders successfully.
4. `/tools/meme-mcp-server` renders successfully.
5. `/api/health` returns HTTP 200 with `status: "ok"`.
6. HTTPS works for both the apex and `www` hosts.
7. The database check reports healthy persistent storage.

## Deployment recovery

1. Confirm the hosting account is active and all production invoices are paid.
2. Confirm `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` exist in GitHub Actions secrets.
3. Confirm the Vercel project is linked to `D0ubl3-A/illco-command` and the production branch is `main`.
4. Run the `Verify and deploy ILLCO Command` workflow.
5. Review the route-verification step before treating the deployment as complete.

## Database recovery

1. Confirm the database integration is active and billable.
2. Confirm one supported production configuration exists:
   - `DATABASE_URL` or `POSTGRES_URL`, or
   - the Aurora DSQL storage variables documented in `.env.example`.
3. Open `/api/health` and verify the database check reports `ok`.
4. Open `/brain` with the trusted admin account and verify storage mode is persistent database storage.

## Incident rule

Do not mark an incident resolved until the public route, the direct deployment route, the health endpoint, and the affected dependency all pass their checks.
