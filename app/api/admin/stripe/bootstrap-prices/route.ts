import { NextResponse } from "next/server";
import Stripe from "stripe";

import { env } from "@/lib/env";

const monthlyPlans = [
  { planId: "core", name: "ILLCO Core", amount: 900 },
  { planId: "studio", name: "ILLCO Studio", amount: 1900 },
  { planId: "suite", name: "ILLCO Suite", amount: 2900 },
  { planId: "agency", name: "ILLCO Agency", amount: 4900 },
] as const;

function authorized(request: Request) {
  if (!env.adminApiKey) return false;
  const adminHeader = request.headers.get("x-admin-api-key") || "";
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  return adminHeader === env.adminApiKey || bearer === env.adminApiKey;
}

async function findOrCreateProduct(stripe: Stripe, name: string) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find((product) => product.name === name);
  if (existing) return existing;
  return stripe.products.create({
    name,
    metadata: {
      app: "illco-command",
    },
  });
}

async function findOrCreatePrice(stripe: Stripe, input: (typeof monthlyPlans)[number], productId: string) {
  const lookupKey = `illco_${input.planId}_monthly`;
  const existing = await stripe.prices.list({ active: true, lookup_keys: [lookupKey], limit: 1 });
  if (existing.data[0]) return existing.data[0];

  return stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: input.amount,
    recurring: {
      interval: "month",
    },
    lookup_key: lookupKey,
    nickname: `${input.name} Monthly`,
    metadata: {
      app: "illco-command",
      planId: input.planId,
    },
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ detail: "Unauthorized." }, { status: 401 });
  }

  if (!env.stripeSecretKey) {
    return NextResponse.json({ detail: "STRIPE_SECRET_KEY is missing in the Vercel runtime." }, { status: 409 });
  }

  const mode = env.stripeSecretKey.startsWith("sk_live_") ? "live" : env.stripeSecretKey.startsWith("sk_test_") ? "test" : "invalid";
  if (mode !== "live") {
    return NextResponse.json(
      { detail: "Production Stripe bootstrap requires a live sk_live_ key on Vercel.", mode },
      { status: 409 },
    );
  }

  const stripe = new Stripe(env.stripeSecretKey);
  const prices: Record<string, string> = {};

  for (const plan of monthlyPlans) {
    const product = await findOrCreateProduct(stripe, plan.name);
    const price = await findOrCreatePrice(stripe, plan, product.id);
    prices[`STRIPE_PRICE_${plan.planId.toUpperCase()}_ID`] = price.id;
  }

  return NextResponse.json({
    mode,
    prices,
  });
}
