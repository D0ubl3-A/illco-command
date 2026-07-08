"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, Grid, List, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";

import { ProductCard } from "@/components/product/product-card";
import type { ProductRecord } from "@/lib/deployments";
import { featuredProductIds } from "@/lib/deployments";
import {
  storefrontCategoryDescriptions,
  storefrontCategoryLabels,
  storefrontCategoryOrder,
  storefrontDisplayName,
  storefrontStage,
} from "@/lib/storefront";

type ProductsCatalogClientProps = {
  products: ProductRecord[];
};

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "name", label: "Name A-Z" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "stage", label: "Stage" },
] as const;

const featuredSet = new Set(featuredProductIds);

function normalize(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export function ProductsCatalogClient({ products }: ProductsCatalogClientProps) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const categoryParam = searchParams.get("category");
  const resolvedCategoryParam = categoryParam === "creative" ? "media" : categoryParam;
  const initialCategory =
    resolvedCategoryParam && storefrontCategoryOrder.includes(resolvedCategoryParam as (typeof storefrontCategoryOrder)[number])
      ? resolvedCategoryParam
      : "all";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedStage, setSelectedStage] = useState("all");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["value"]>("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [liveOnly, setLiveOnly] = useState(false);
  const [googleOnly, setGoogleOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const stages = useMemo(() => {
    return ["all", ...Array.from(new Set(products.map((product) => storefrontStage(product)))).sort((left, right) => left.localeCompare(right))];
  }, [products]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.category, (counts.get(product.category) || 0) + 1);
    }
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalize(query);

    return products
      .filter((product) => selectedCategory === "all" || product.category === selectedCategory)
      .filter((product) => selectedStage === "all" || storefrontStage(product) === selectedStage)
      .filter((product) => (!liveOnly ? true : product.isLive))
      .filter((product) => (!googleOnly ? true : Boolean(product.ssoConnected)))
      .filter((product) => (!featuredOnly ? true : featuredSet.has(product.id)))
      .filter((product) => {
        if (!normalizedQuery) return true;
        const haystack = [
          product.id,
          storefrontDisplayName(product),
          product.description,
          product.category,
          storefrontStage(product),
          product.saleStatus,
          product.owner,
          product.accessModel,
          product.fulfillmentPath,
          product.primaryCta,
        ]
          .filter(Boolean)
          .map((item) => normalize(String(item)))
          .join(" ");
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => {
        switch (sortBy) {
          case "name":
            return storefrontDisplayName(left).localeCompare(storefrontDisplayName(right));
          case "price-low":
            return (left.priceCents || 0) - (right.priceCents || 0);
          case "price-high":
            return (right.priceCents || 0) - (left.priceCents || 0);
          case "stage":
            return storefrontStage(left).localeCompare(storefrontStage(right));
          default: {
            const featuredDelta = Number(featuredSet.has(right.id)) - Number(featuredSet.has(left.id));
            if (featuredDelta !== 0) return featuredDelta;
            const liveDelta = Number(right.isLive) - Number(left.isLive);
            if (liveDelta !== 0) return liveDelta;
            return storefrontDisplayName(left).localeCompare(storefrontDisplayName(right));
          }
        }
      });
  }, [featuredOnly, googleOnly, liveOnly, products, query, selectedCategory, selectedStage, sortBy]);

  const liveCount = products.filter((product) => product.isLive).length;
  const googleCount = products.filter((product) => product.ssoConnected).length;
  const featuredCount = products.filter((product) => featuredSet.has(product.id)).length;

  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("all");
    setSelectedStage("all");
    setSortBy("featured");
    setViewMode("grid");
    setLiveOnly(false);
    setGoogleOnly(false);
    setFeaturedOnly(false);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Visible apps", value: filteredProducts.length },
          { label: "Live apps", value: liveCount },
          { label: "Google OAuth", value: googleCount },
          { label: "Featured picks", value: featuredCount },
        ].map((item) => (
          <div key={item.label} className="rounded-[14px] border border-white/10 bg-white/[0.04] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
            <div className="mt-3 text-3xl font-semibold text-white">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-[14px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-[14px] border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Catalog filters
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Browse the migrated app catalog</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Search by workflow, stage, owner, or access path. The store stays connected to Google OAuth and ChatGPT tools.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-2 rounded-[14px] border px-3 py-2 text-sm font-semibold transition ${
                viewMode === "grid"
                  ? "border-cyan-400/45 bg-cyan-400/12 text-cyan-100"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40 hover:text-white"
              }`}
            >
              <Grid className="h-4 w-4" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-2 rounded-[14px] border px-3 py-2 text-sm font-semibold transition ${
                viewMode === "list"
                  ? "border-cyan-400/45 bg-cyan-400/12 text-cyan-100"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40 hover:text-white"
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.5fr_0.95fr_0.95fr_0.95fr]">
          <label className="relative block">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search apps, owners, stages, or access paths"
              className="h-11 w-full rounded-[14px] border border-white/10 bg-slate-950/80 pl-10 pr-10 text-sm text-white placeholder:text-slate-500"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <label className="block">
            <span className="sr-only">Category</span>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-11 w-full rounded-[14px] border border-white/10 bg-slate-950/80 px-3 text-sm text-white"
            >
              <option value="all">All categories</option>
              {storefrontCategoryOrder.map((category) => (
                <option key={category} value={category}>
                  {storefrontCategoryLabels[category]} ({categoryCounts.get(category) || 0})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Stage</span>
            <select
              value={selectedStage}
              onChange={(event) => setSelectedStage(event.target.value)}
              className="h-11 w-full rounded-[14px] border border-white/10 bg-slate-950/80 px-3 text-sm text-white"
            >
              <option value="all">All stages</option>
              {stages.slice(1).map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Sort</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as (typeof sortOptions)[number]["value"])}
              className="h-11 w-full rounded-[14px] border border-white/10 bg-slate-950/80 px-3 text-sm text-white"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {storefrontCategoryOrder.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(isActive ? "all" : category)}
                className={`rounded-[14px] border px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-cyan-400/45 bg-cyan-400/12 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/40 hover:text-white"
                }`}
              >
                {storefrontCategoryLabels[category]} <span className="text-slate-500">({categoryCounts.get(category) || 0})</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {[
            {
              label: "Live only",
              checked: liveOnly,
              onChange: () => setLiveOnly((current) => !current),
            },
            {
              label: "Google OAuth",
              checked: googleOnly,
              onChange: () => setGoogleOnly((current) => !current),
            },
            {
              label: "Featured only",
              checked: featuredOnly,
              onChange: () => setFeaturedOnly((current) => !current),
            },
          ].map((toggle) => (
            <label
              key={toggle.label}
              className={`inline-flex items-center gap-2 rounded-[14px] border px-3 py-2 text-sm font-medium transition ${
                toggle.checked
                  ? "border-cyan-400/45 bg-cyan-400/12 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300"
              }`}
            >
              <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={toggle.checked} onChange={toggle.onChange} />
              {toggle.label}
            </label>
          ))}

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            Reset
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Filter className="h-4 w-4 text-cyan-300" />
          Showing <span className="font-semibold text-white">{filteredProducts.length}</span> apps
        </div>
        <div className="text-sm text-slate-500">
          {selectedCategory !== "all" ? storefrontCategoryDescriptions[selectedCategory as keyof typeof storefrontCategoryDescriptions] : "All categories"}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="mt-6 rounded-[14px] border border-white/10 bg-white/[0.03] p-8 text-center">
          <h3 className="text-2xl font-semibold text-white">No apps match those filters</h3>
          <p className="mt-2 text-sm text-slate-400">Clear the filters and try a broader search term.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 inline-flex items-center gap-2 rounded-[14px] border border-cyan-400/35 bg-cyan-400/12 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3" : "mt-6 grid gap-4"}>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              featured={featuredSet.has(product.id)}
              variant={viewMode}
            />
          ))}
        </div>
      )}
    </section>
  );
}
