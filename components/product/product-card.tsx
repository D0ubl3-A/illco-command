"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldCheck, Sparkles, Star } from "lucide-react";

import type { ProductRecord } from "@/lib/deployments";
import { getProductModuleHref } from "@/lib/product-routes";
import {
  storefrontCategoryLabels,
  storefrontDisplayName,
  storefrontPriceLabel,
  storefrontProductImage,
  storefrontRating,
  storefrontStage,
} from "@/lib/storefront";

type ProductCardProps = {
  product: ProductRecord;
  featured?: boolean;
  highlighted?: boolean;
  variant?: "grid" | "list";
};

function getLaunchLabel(product: ProductRecord) {
  if (product.primaryCta?.trim()) return product.primaryCta.trim();
  if (product.requiresLogin || product.ssoConnected) return "Open";
  if (product.paymentUrl) return "Checkout";
  return "Launch";
}

export function ProductCard({ product, featured = false, highlighted = false, variant = "grid" }: ProductCardProps) {
  const detailHref = `/apps/${encodeURIComponent(product.id)}`;
  const launchHref = getProductModuleHref(product.id);
  const launchTarget = /^https?:\/\//i.test(launchHref) ? "_blank" : undefined;
  const launchRel = launchTarget ? "noreferrer" : undefined;
  const displayName = storefrontDisplayName(product);
  const image = storefrontProductImage(product);
  const categoryLabel = storefrontCategoryLabels[product.category];
  const statusLabel = storefrontStage(product);
  const priceLabel = storefrontPriceLabel(product);

  const badgeItems = [
    categoryLabel,
    statusLabel,
    product.saleStatus,
    product.ssoConnected ? "Google OAuth" : null,
    product.requiresLogin ? "Login required" : null,
  ].filter(Boolean) as string[];

  const sharedCardClasses = [
    "group overflow-hidden rounded-lg border bg-white/[0.04] transition",
    highlighted ? "border-amber-300/55 ring-1 ring-amber-300/35" : "border-white/10 hover:border-cyan-300/40",
  ].join(" ");

  if (variant === "list") {
    return (
      <article className={sharedCardClasses}>
        <div className="grid lg:grid-cols-[19rem_1fr]">
          <Link href={detailHref} className="relative block h-full min-h-[14rem] overflow-hidden bg-slate-900">
            <img
              src={image}
              alt={`${displayName} preview`}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent p-4">
              <div className="flex flex-wrap gap-2">
                {featured ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-300 px-2.5 py-1 text-xs font-semibold text-slate-950">
                    <Sparkles className="h-3.5 w-3.5" />
                    Featured
                  </span>
                ) : null}
                {badgeItems.slice(0, 2).map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.07] px-2.5 py-1 text-xs font-medium text-slate-100"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </Link>

          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Link href={detailHref} className="text-lg font-semibold leading-6 text-white transition group-hover:text-cyan-200">
                  {displayName}
                </Link>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{product.description}</p>
              </div>
              <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-amber-200">
                <Star className="h-3.5 w-3.5 fill-current" />
                {storefrontRating(product)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {badgeItems.map((badge) => (
                <span key={badge} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-300">
                  {badge}
                </span>
              ))}
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Price</div>
                <div className="mt-1 text-2xl font-semibold text-cyan-200">{priceLabel}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={detailHref}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
                >
                  Details
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={launchHref}
                  target={launchTarget}
                  rel={launchRel}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-400/12 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
                >
                  {getLaunchLabel(product)}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={sharedCardClasses}>
      <Link href={detailHref} className="relative block aspect-[4/3] overflow-hidden bg-slate-900">
        <img
          src={image}
          alt={`${displayName} preview`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/82 via-slate-950/15 to-transparent p-4">
          <div className="flex flex-wrap gap-2">
            {featured ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-300 px-2.5 py-1 text-xs font-semibold text-slate-950">
                <Sparkles className="h-3.5 w-3.5" />
                Featured
              </span>
            ) : null}
            {product.isLive ? (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Live
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={detailHref} className="block text-lg font-semibold leading-6 text-white transition group-hover:text-cyan-200">
              {displayName}
            </Link>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{product.description}</p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-amber-200">
            <Star className="h-3.5 w-3.5 fill-current" />
            {storefrontRating(product)}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {badgeItems.slice(0, 4).map((badge) => (
            <span key={badge} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-300">
              {badge}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Price</div>
            <div className="mt-1 text-2xl font-semibold text-cyan-200">{priceLabel}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={detailHref}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
            >
              Details
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={launchHref}
              target={launchTarget}
              rel={launchRel}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-400/12 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
            >
              {getLaunchLabel(product)}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
