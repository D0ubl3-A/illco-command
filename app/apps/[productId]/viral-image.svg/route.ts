import { notFound } from "next/navigation";

import { getAppLandingProduct } from "@/lib/app-funnel";
import { getProductViralImageSvg } from "@/lib/product-marketing";

type ProductViralImageRouteProps = {
  params: Promise<{ productId: string }>;
};

export async function GET(_request: Request, { params }: ProductViralImageRouteProps) {
  const { productId } = await params;
  const product = getAppLandingProduct(productId);
  if (!product) notFound();

  return new Response(getProductViralImageSvg(product), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
