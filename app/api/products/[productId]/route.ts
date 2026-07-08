import { NextResponse } from "next/server";

import { getProductById } from "@/lib/deployments";
import { getProductViralImagePath } from "@/lib/product-marketing";
import { getProductModuleHref } from "@/lib/product-routes";

type ProductRouteProps = {
  params: Promise<{ productId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: ProductRouteProps) {
  const { productId } = await params;
  const product = getProductById(productId);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  return NextResponse.json({
    id: product.id,
    name: product.displayName,
    description: product.description,
    category: product.category,
    stage: product.stage || product.updated,
    liveUrl: product.liveUrl || product.productionUrl,
    launchUrl: getProductModuleHref(product.id),
    loginUrl: product.loginUrl,
    paymentUrl: product.paymentUrl,
    primaryCta: product.primaryCta,
    imageUrl: getProductViralImagePath(product),
    isLive: product.isLive,
    ssoConnected: product.ssoConnected,
    requiresLogin: product.requiresLogin,
    registrySource: product.registrySource,
  });
}
