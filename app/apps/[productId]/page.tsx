import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, ExternalLink, ShieldCheck, Sparkles, Star, Workflow } from "lucide-react";

import { ProductCard } from "@/components/product/product-card";
import { getProductById, products, type ProductRecord } from "@/lib/deployments";
import { getProductViralImagePath } from "@/lib/product-marketing";
import { getProductModuleHref } from "@/lib/product-routes";
import {
  storefrontCategoryLabels,
  storefrontDisplayName,
  storefrontPriceLabel,
  storefrontProductImage,
  storefrontRating,
  storefrontStage,
} from "@/lib/storefront";

type ProductPageProps = {
  params: Promise<{ productId: string }>;
};

const siteUrl = "https://illcoai.tech";

function getAccessLabel(product: ProductRecord) {
  if (product.ssoConnected) return "Google OAuth";
  if (product.requiresLogin) return "Login required";
  return "Open access";
}

function getPrimaryCta(product: ProductRecord) {
  if (product.primaryCta?.trim()) return product.primaryCta.trim();
  if (product.paymentUrl) return "Checkout";
  if (product.ssoConnected || product.requiresLogin) return "Open with Google";
  return "Open app";
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = getProductById(productId);
  if (!product) return {};

  const productName = storefrontDisplayName(product);
  const image = storefrontProductImage(product);
  const description = product.description || `${productName} on the ILLCO AI App Store.`;

  return {
    title: `${productName} | ILLCO AI App Store`,
    description,
    alternates: {
      canonical: `${siteUrl}/apps/${product.id}`,
    },
    openGraph: {
      title: `${productName} | ILLCO AI App Store`,
      description,
      url: `${siteUrl}/apps/${product.id}`,
      type: "website",
      images: image ? [{ url: image, width: 1600, height: 900, alt: `${productName} preview` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${productName} | ILLCO AI App Store`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { productId } = await params;
  const product = getProductById(productId);
  if (!product) notFound();

  const productName = storefrontDisplayName(product);
  const appLandingProductImage = storefrontProductImage(product) || getProductViralImagePath(product);
  const launchHref = getProductModuleHref(product.id);
  const launchTarget = /^https?:\/\//i.test(launchHref) ? "_blank" : undefined;
  const launchRel = launchTarget ? "noreferrer" : undefined;
  const relatedProducts = products.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 4);
  const googleOAuthHref = `/api/account/google/start?returnTo=${encodeURIComponent(`/apps/${product.id}`)}`;

  return (
    <main id="main-content" className="bg-slate-950">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_18%,rgba(68,215,255,0.11),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(255,186,58,0.10),transparent_26%),linear-gradient(180deg,rgba(7,10,16,0.98),rgba(5,7,12,0.98))]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </Link>

          <div className="mt-6 grid gap-10 lg:grid-cols-[0.96fr_1.04fr] lg:items-start">
            <div>
              <div className="overflow-hidden rounded-[8px] border border-white/10 bg-slate-900">
                <img
                  src={appLandingProductImage}
                  alt={`${productName} preview`}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Stage", value: storefrontStage(product), icon: CheckCircle2 },
                  { label: "Category", value: storefrontCategoryLabels[product.category], icon: Bot },
                  { label: "Rating", value: storefrontRating(product), icon: Star },
                  { label: "Access", value: getAccessLabel(product), icon: ShieldCheck },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                    <Icon className="h-5 w-5 text-cyan-300" />
                    <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
                    <div className="mt-1 text-sm font-semibold text-white">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-[8px] border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                  <Workflow className="h-3.5 w-3.5" />
                  {storefrontCategoryLabels[product.category]}
                </span>
                <span className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200">
                  {storefrontStage(product)}
                </span>
                {product.saleStatus ? (
                  <span className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200">
                    {product.saleStatus}
                  </span>
                ) : null}
                {product.ssoConnected ? (
                  <span className="inline-flex items-center gap-2 rounded-[8px] border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Google OAuth
                  </span>
                ) : null}
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{productName}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">{product.description}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {[product.owner, product.accessModel, product.fulfillmentPath, product.checkoutOfferId].filter(Boolean).map((item) => (
                  <span key={item} className="rounded-[8px] border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 rounded-[8px] border border-white/10 bg-white/[0.03] p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Price</div>
                    <div className="mt-1 text-4xl font-semibold text-cyan-200">{storefrontPriceLabel(product)}</div>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                      {product.paymentUrl ? "Checkout is available through the product payment path." : "Pricing is quote-based or handled after review."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={launchHref}
                      target={launchTarget}
                      rel={launchRel}
                      className="inline-flex items-center gap-2 rounded-[8px] border border-cyan-400/35 bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                    >
                      {getPrimaryCta(product)}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    {product.ssoConnected || product.requiresLogin ? (
                      <a
                        href={googleOAuthHref}
                        className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
                      >
                        Google OAuth
                        <ShieldCheck className="h-4 w-4" />
                      </a>
                    ) : null}
                    {product.paymentUrl ? (
                      <a
                        href={product.paymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
                      >
                        Checkout
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                    {product.id === "lyric-video-forge" ? (
                      <Link
                        href="/tools/lyric-video-forge"
                        className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
                      >
                        ChatGPT tool
                        <Sparkles className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Login", value: product.loginUrl ? "Connected" : "Not set" },
                  { label: "Live URL", value: product.liveUrl || product.productionUrl || "Not set" },
                  { label: "Demo", value: product.demoUrl || product.demoEmbedUrl || "Not set" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
                    <div className="mt-2 break-words text-sm font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {product.demoEmbedUrl ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-white">Proof</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Embedded demo or proof path for the current product.</p>
            </div>
            <div className="overflow-hidden rounded-[8px] border border-white/10 bg-slate-900">
              <iframe
                title={`${productName} demo`}
                src={`${product.demoEmbedUrl}${product.demoEmbedUrl.includes("?") ? "&" : "?"}rel=0`}
                className="h-[32rem] w-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Related apps</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Same category, different angle.</p>
          </div>
        </div>

        {relatedProducts.length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[8px] border border-white/10 bg-white/[0.03] p-8 text-sm text-slate-400">
            No related apps in this category yet.
          </div>
        )}
      </section>
    </main>
  );
}
