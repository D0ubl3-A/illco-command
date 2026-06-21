# iLLCo Command

Production app for [illcoai.tech](https://illcoai.tech): the iLLCo AI product catalog, app landing pages, account access, paid unlockables, proof sections, and customer-facing product surfaces.

## Stack

- Next.js 16
- React 19
- TypeScript
- Stripe checkout integration
- Vercel deployment
- OpenAI Agents SDK integration

## Local Development

```powershell
npm install
npm run dev
```

Open the local URL printed by Next.js.

## Verification

```powershell
npm run build
npm test
```

## Environment

Use `.env.example` as the public template. Real `.env*` files are intentionally ignored and must stay out of Git.

## Deployment

The production domain is:

- https://illcoai.tech

Deployments are handled through Vercel.
