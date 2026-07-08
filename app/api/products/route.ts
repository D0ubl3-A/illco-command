import { NextResponse } from "next/server";

import { products } from "@/lib/deployments";
import { getProductViralImagePath } from "@/lib/product-marketing";

export const dynamic = "force-static";

export function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get("limit") || "", 10);
  const category = String(url.searchParams.get("category") || "").trim();
  const q = String(url.searchParams.get("q") || "").trim().toLowerCase();

  let rows = products;
  if (category) rows = rows.filter((product) => product.category === category);
  if (q) {
    rows = rows.filter((product) =>
      [product.id, product.name, product.displayName, product.description, product.category, product.stage]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  const limitedRows = Number.isFinite(limit) && limit > 0 ? rows.slice(0, Math.min(limit, 200)) : rows;

  return NextResponse.json(
    limitedRows.map((product) => ({
      id: product.id,
      name: product.displayName,
      description: product.description,
      category: product.category,
      stage: product.stage || product.updated,
      liveUrl: product.liveUrl || product.productionUrl,
      loginUrl: product.loginUrl,
      paymentUrl: product.paymentUrl,
      primaryCta: product.primaryCta,
      imageUrl: getProductViralImagePath(product),
      isLive: product.isLive,
      ssoConnected: product.ssoConnected,
      requiresLogin: product.requiresLogin,
      registrySource: product.registrySource,
    })),
  );
}
