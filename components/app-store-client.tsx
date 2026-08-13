"use client";

import { useMemo, useState, type CSSProperties } from "react";

export type AppStoreProduct = {
  id: string;
  title: string;
  category: string;
  categoryDescription: string;
  price: number;
  priceLabel: string;
  billing: string;
  badge: string;
  summary: string;
  chips: string[];
  details: Array<{ label: string; value: string }>;
  featured: boolean;
  accent: string;
  accent2: string;
  code: string;
  image: string;
  appHref: string;
  skipHref: string;
  purchaseMode: "direct-buy" | "book-service" | "quote-only";
  checkoutProductId?: string;
  checkoutPlanId?: string;
};

export type HelloskipBlogPost = {
  title: string;
  date: string;
  topic: string;
};

type AppStoreClientProps = {
  products: AppStoreProduct[];
  categories: Array<{ name: string; description: string; count: number; accent: string; accent2: string }>;
  accountHref: string;
  googleHref: string;
  skipProfileHref: string;
  skipBlogHref: string;
  skipBlogPosts: HelloskipBlogPost[];
};

const allCategory = "All";

const appStoreBuildShareUrl = "https://www.illcoai.tech/#build";
const appStoreBuildShareTitle = "ILLCO AI custom build desk";
const appStoreBuildShareCopy = "Build a custom AI storefront, workflow, or launch stack with ILLCO AI.";

const creatorPipelineStatus = [
  {
    title: "VoiceBook OS",
    status: "Built",
    copy: "Flagship voice-first content pipeline for scripts, shorts, captions, and memory-backed creator workflows.",
  },
  {
    title: "Vocal Visualizer",
    status: "Built",
    copy: "Voice-reactive visual lane for turning vocals, hooks, and spoken clips into branded motion assets.",
  },
  {
    title: "Viral Stitch AI",
    status: "Built",
    copy: "Short-form stitching workflow for turning creator clips, proof, and testimonials into social variants.",
  },
  {
    title: "Lyric Video Forge",
    status: "Keep stable",
    copy: "Existing lyric-video product stays intact as its own specialized forge in the creator pipeline.",
  },
  {
    title: "Meme Forge",
    status: "Keep stable",
    copy: "Existing meme/product-idea forge stays intact as a separate traffic and content engine.",
  },
  {
    title: "Hub account layer",
    status: "In progress",
    copy: "ILLCO Command remains the login, purchase, access, memory, and cross-app account hub.",
  },
] as const;

function getAppStoreBuildShareLinks() {
  const encodedUrl = encodeURIComponent(appStoreBuildShareUrl);
  const encodedCopy = encodeURIComponent(appStoreBuildShareCopy);
  const encodedTitle = encodeURIComponent(appStoreBuildShareTitle);
  const emailBody = encodeURIComponent(`${appStoreBuildShareCopy}\n\n${appStoreBuildShareUrl}`);

  return [
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedCopy}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "Email", href: `mailto:?subject=${encodedTitle}&body=${emailBody}` },
  ];
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
  const int = Number.parseInt(value, 16);

  if (Number.isNaN(int)) return "78, 231, 246";
  return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
}

function styleVars(accent: string, accent2: string) {
  const accentRgb = hexToRgb(accent);
  const accent2Rgb = hexToRgb(accent2);

  return {
    "--store-card-accent": accent,
    "--store-card-accent-2": accent2,
    "--store-card-accent-rgb": accentRgb,
    "--store-card-accent-2-rgb": accent2Rgb,
  } as CSSProperties;
}

function searchText(product: AppStoreProduct) {
  return [product.title, product.category, product.summary, product.chips.join(" ")].join(" ").toLowerCase();
}

export function AppStoreClient({
  products,
  categories,
  accountHref,
  googleHref,
  skipProfileHref,
  skipBlogHref,
  skipBlogPosts,
}: AppStoreClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(allCategory);
  const [sort, setSort] = useState("featured");
  const [cart, setCart] = useState<Set<string>>(() => new Set());
  const [shareStatus, setShareStatus] = useState("");

  const categoryThemes = useMemo(() => {
    const entries = new Map<string, { accent: string; accent2: string }>();
    entries.set(allCategory, { accent: "#5cf1ff", accent2: "#96f0d0" });
    for (const item of categories) {
      entries.set(item.name, { accent: item.accent, accent2: item.accent2 });
    }
    return entries;
  }, [categories]);

  const featuredProducts = useMemo(() => products.filter((product) => product.featured).slice(0, 4), [products]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((product) => {
      const matchesCategory = category === allCategory || product.category === category;
      const matchesQuery = !q || searchText(product).includes(q);
      return matchesCategory && matchesQuery;
    });

    return [...list].sort((left, right) => {
      if (sort === "priceAsc") return left.price - right.price || left.title.localeCompare(right.title);
      if (sort === "priceDesc") return right.price - left.price || left.title.localeCompare(right.title);
      if (sort === "name") return left.title.localeCompare(right.title);
      return Number(right.featured) - Number(left.featured) || left.title.localeCompare(right.title);
    });
  }, [category, products, query, sort]);

  const selectedProducts = products.filter((product) => cart.has(product.id));
  const cartTotal = selectedProducts.reduce((sum, product) => sum + product.price, 0);

  const toggleCart = (id: string) => {
    setCart((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const requestQuote = (ids: string[]) => {
    const chosen = ids.map((id) => products.find((product) => product.id === id)).filter(Boolean) as AppStoreProduct[];
    if (!chosen.length) return;

    const total = money(chosen.reduce((sum, product) => sum + product.price, 0));
    const subject = encodeURIComponent(`ILLCO AI quote request (${chosen.length} item${chosen.length === 1 ? "" : "s"})`);
    const body = encodeURIComponent(
      [
        "Hi ILLCO team,",
        "",
        "I'd like a quote for the following stack:",
        ...chosen.map((product) => `- ${product.title} (${product.priceLabel})`),
        "",
        `Estimated total: ${total}`,
        "",
        "Please reply with next steps.",
      ].join("\n"),
    );

    window.location.href = `mailto:admin@illcoai.tech?subject=${subject}&body=${body}`;
  };

  const shareLinks = getAppStoreBuildShareLinks();
  async function copyBuildShareLink() {
    try {
      await navigator.clipboard.writeText(appStoreBuildShareUrl);
      setShareStatus("Build link copied.");
    } catch {
      setShareStatus("Copy blocked. Use a social link or email.");
    }
  }

  async function shareBuildDesk() {
    setShareStatus("");
    if (navigator.share) {
      try {
        await navigator.share({
          title: appStoreBuildShareTitle,
          text: appStoreBuildShareCopy,
          url: appStoreBuildShareUrl,
        });
        setShareStatus("Share sheet opened.");
        return;
      } catch {
        setShareStatus("Share canceled. Direct links are ready.");
        return;
      }
    }

    await copyBuildShareLink();
  }

  const categoryTheme = categoryThemes.get(category) || categoryThemes.get(allCategory)!;

  return (
    <main id="top" className="appStoreShell" style={styleVars(categoryTheme.accent, categoryTheme.accent2)}>
      <header className="appStoreTopbar">
        <div className="appStoreWrap appStoreTopbarInner">
          <a className="appStoreBrand" href="#top" aria-label="ILLCO AI App Store home">
            <span className="appStoreBrandMark">IA</span>
            <span className="appStoreBrandCopy">
              <strong>ILLCO AI App Store</strong>
              <span>Launch-ready apps and systems</span>
            </span>
          </a>

          <nav className="appStoreNav" aria-label="Primary">
            <a href="#categories">Categories</a>
            <a href="#catalog">Catalog</a>
            <a href="/products">Apps</a>
            <a href="/tools/lyric-video-forge">ChatGPT</a>
            <a href="/commander">Commander</a>
            <a href="#creator-status">Status</a>
            <a href="#skip-proof">Skip proof</a>
            <a href="#skip-blog">Skip blog</a>
            <a href="#build">Custom build</a>
            <a href="#support">Support</a>
          </nav>

          <div className="appStoreActions">
            <a className="appStorePill" href="mailto:admin@illcoai.tech">admin@illcoai.tech</a>
            <a className="appStorePill" href={skipProfileHref} target="_blank" rel="noreferrer">Helloskip profile</a>
            <a className="appStorePill" href={accountHref}>Manage account</a>
            <a className="appStoreBtn appStoreBtnPrimary" href={googleHref}>Sign in with Google</a>
            <a className="appStoreBtn appStoreBtnSecondary" href="#catalog">Browse catalog</a>
          </div>
        </div>
      </header>

      <section className="appStoreHero">
        <div className="appStoreWrap appStoreHeroGrid">
          <div className="appStoreHeroCopy">
            <p className="appStoreEyebrow">Premium AI marketplace</p>
            <h1>Buy working AI apps built to ship.</h1>
            <p>
              The ILLCO catalog brings production tools, launchable workflows, creative engines,
              lead systems, sales assistants, and custom builds into one premium marketplace.
              Everything here is shaped to ship.
            </p>
            <p className="appStoreBackendNote">
              Shared login, account history, and Google sign-in run through the ILLCO Command backend.
            </p>

            <div className="appStoreHeroActions">
              <a className="appStoreBtn appStoreBtnPrimary" href="#catalog">Browse featured builds</a>
              <a className="appStoreBtn appStoreBtnSecondary" href="#build">Request a custom stack</a>
              <a className="appStoreBtn appStoreBtnQuiet" href={skipProfileHref} target="_blank" rel="noreferrer">View on Helloskip</a>
              <button className="appStoreBtn appStoreBtnQuiet" type="button" onClick={() => document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" })}>
                See categories
              </button>
            </div>

            <div className="appStoreHeroMeta" aria-live="polite">
              <article><strong>{products.length}</strong><span>Live products in the catalog</span></article>
              <article><strong>{categories.length}</strong><span>Store categories ready to browse</span></article>
              <article><strong>{products.filter((product) => product.featured).length}</strong><span>Featured and custom lanes</span></article>
            </div>
          </div>

          <div className="appStoreHeroVisual">
            <div className="appStoreMosaic">
              {featuredProducts.map((product, index) => (
                <article className={`appStoreMosaicCard appStoreFloat${index + 1}`} key={product.id} style={styleVars(product.accent, product.accent2)}>
                  <div className="appStoreMosaicTop">
                    <span>{product.category}</span>
                    <strong>{product.badge}</strong>
                  </div>
                  <a className="appStoreArtShell appStoreImageLink" href={product.appHref} aria-label={`View ${product.title} details`}>
                    <img src={product.image} alt="" loading={index === 0 ? "eager" : "lazy"} />
                  </a>
                  <div className="appStoreMosaicCopy">
                    <h3>{product.title}</h3>
                    <p>{product.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="appStoreSection appStoreCreatorStatus" id="creator-status">
        <div className="appStoreWrap">
          <div className="appStoreSectionHead">
            <div>
              <p className="appStoreEyebrow">Creator pipeline status</p>
              <h2>Some pieces are already built. Keep the forges stable.</h2>
            </div>
            <p>
              The acquisition path is not starting from zero. VoiceBook OS, Vocal Visualizer, and Viral Stitch become the flagship creator pipeline,
              while Lyric Video Forge and Meme Forge stay as focused products inside the wider hub.
            </p>
          </div>

          <div className="appStoreStatusGrid">
            {creatorPipelineStatus.map((item) => (
              <article className="appStoreStatusCard" key={item.title}>
                <span>{item.status}</span>
                <strong>{item.title}</strong>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="appStoreSection appStoreSkipProof" id="skip-proof">
        <div className="appStoreWrap">
          <div className="appStoreSkipGrid">
            <div>
              <p className="appStoreEyebrow">Marketplace proof layer</p>
              <h2>Use Helloskip for discovery. Use ILLCO for conversion.</h2>
              <p>
                Your Helloskip profile gives buyers a public marketplace signal, while this site keeps the deeper product pages,
                account login, checkout routing, proof assets, and quote flow under your own brand.
              </p>
              <div className="appStoreHeroActions">
                <a className="appStoreBtn appStoreBtnPrimary" href={skipProfileHref} target="_blank" rel="noreferrer">Open Helloskip profile</a>
                <a className="appStoreBtn appStoreBtnSecondary" href="#catalog">Shop on ILLCO</a>
              </div>
            </div>

            <div className="appStoreSkipStats" aria-label="Helloskip profile proof points">
              <article>
                <strong>123</strong>
                <span>Helloskip followers pointing back to the brand</span>
              </article>
              <article>
                <strong>99</strong>
                <span>Connections adding marketplace trust</span>
              </article>
              <article>
                <strong>{products.length}</strong>
                <span>ILLCO-owned product paths ready to deepen the click</span>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="appStoreSection appStoreSkipBlog" id="skip-blog">
        <div className="appStoreWrap">
          <div className="appStoreSectionHead">
            <div>
              <p className="appStoreEyebrow">Helloskip blog engine</p>
              <h2>Use the Skip articles as search fuel.</h2>
            </div>
            <p>
              These Helloskip posts can feed ILLCO topic clusters, product pages, email follow-up, and proof-led buying paths
              while the full article archive remains linked as a public authority source.
            </p>
          </div>

          <div className="appStoreBlogGrid">
            {skipBlogPosts.map((post) => (
              <a className="appStoreBlogCard" href={skipBlogHref} target="_blank" rel="noreferrer" key={`${post.title}-${post.date}`}>
                <span>{post.topic}</span>
                <h3>{post.title}</h3>
                <p>{post.date}</p>
              </a>
            ))}
          </div>

          <div className="appStoreBlogCta">
            <strong>101+ Helloskip articles can become ILLCO internal links, product hooks, and SEO support content.</strong>
            <a className="appStoreBtn appStoreBtnPrimary" href={skipBlogHref} target="_blank" rel="noreferrer">View full Skip blog</a>
          </div>
        </div>
      </section>

      <section className="appStoreSection" id="categories">
        <div className="appStoreWrap">
          <div className="appStoreSectionHead">
            <div>
              <p className="appStoreEyebrow">Browse by category</p>
              <h2>Find the right system for the job.</h2>
            </div>
            <p>Use the filters to narrow the catalog to storefronts, automations, growth tools, creative systems, support plans, or custom build work.</p>
          </div>

          <div className="appStoreCategoryGrid">
            {categories.map((item) => (
              <button
                className="appStoreCategoryCard"
                type="button"
                data-active={category === item.name}
                key={item.name}
                onClick={() => setCategory(item.name)}
                style={styleVars(item.accent, item.accent2)}
              >
                <strong>{item.name}</strong>
                <span>{item.count} item{item.count === 1 ? "" : "s"}</span>
                <p>{item.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="appStoreSection" id="catalog">
        <div className="appStoreWrap">
          <div className="appStoreCatalogToolbar">
            <div>
              <p className="appStoreEyebrow">Featured catalog</p>
              <h2>Buy ready products, book managed services, or request a custom quote.</h2>
              <p aria-live="polite">
                Showing {filteredProducts.length} of {products.length} products{category === allCategory ? "" : ` in ${category}`}{query.trim() ? ` for "${query.trim()}"` : ""}.
              </p>
            </div>

            <div className="appStoreToolbarRight">
              <label className="appStoreSearchGroup">
                <span aria-hidden="true">Search</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  type="search"
                  placeholder="Search apps, automations, or custom builds"
                  autoComplete="off"
                />
              </label>

              <label className="appStoreSelectWrap">
                <span>Sort</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort catalog">
                  <option value="featured">Featured</option>
                  <option value="priceAsc">Price: low to high</option>
                  <option value="priceDesc">Price: high to low</option>
                  <option value="name">Name</option>
                </select>
              </label>
            </div>
          </div>

          <div className="appStoreFilterRow" aria-label="Catalog filters">
            {[allCategory, ...categories.map((item) => item.name)].map((name) => {
              const theme = categoryThemes.get(name) || categoryThemes.get(allCategory)!;
              return (
                <button
                  className={category === name ? "isActive" : ""}
                  type="button"
                  key={name}
                  onClick={() => setCategory(name)}
                  style={styleVars(theme.accent, theme.accent2)}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <div className="appStoreCatalogLayout">
            <div className="appStoreProductGrid">
              {filteredProducts.length ? (
                filteredProducts.map((product) => {
                  const inCart = cart.has(product.id);

                  return (
                    <article className={`appStoreProductCard ${inCart ? "isActive" : ""}`} key={product.id} style={styleVars(product.accent, product.accent2)}>
                      <a className="appStoreThumb appStoreImageLink" href={product.appHref} aria-label={`View ${product.title} details`}>
                        <div className="appStoreTagline">
                          <strong>{product.category}</strong>
                          <span>{product.badge}</span>
                        </div>
                        <img src={product.image} alt={`${product.title} product preview`} loading="lazy" />
                        <div className="appStorePriceBadge">
                          <span>Starting at</span>
                          <strong>{product.priceLabel}</strong>
                        </div>
                      </a>

                      <div className="appStoreCardBody">
                        <div className="appStoreCardHead">
                          <div>
                            <h3>{product.title}</h3>
                            <p>{product.summary}</p>
                          </div>
                          <span className="appStoreBadge">{product.billing}</span>
                        </div>

                        <div className="appStoreFeatureList">
                          {product.chips.map((chip) => <span key={chip}>{chip}</span>)}
                        </div>

                        <div className="appStoreCardInfo">
                          {product.details.map((item) => (
                            <div key={item.label}>
                              <span>{item.label}</span>
                              <strong>{item.value}</strong>
                            </div>
                          ))}
                        </div>

                        <div className="appStoreCardFooter">
                          <div className="appStorePriceBlock">
                            <strong>{product.priceLabel}</strong>
                            <span>{product.billing === "Monthly" ? "Estimated monthly plan" : product.billing === "Quote" ? "Custom scope available" : "Digital delivery"}</span>
                          </div>

                          <div className="appStoreCardActions">
                            {product.purchaseMode === "direct-buy" && product.checkoutProductId && product.checkoutPlanId ? (
                              <form action="/api/subscriptions/checkout" method="post" className="inlineCheckoutForm">
                                <input type="hidden" name="planId" value={product.checkoutPlanId} />
                                <input type="hidden" name="productId" value={product.checkoutProductId} />
                                <input type="hidden" name="returnTo" value={product.appHref} />
                                <button type="submit">Buy now — {product.priceLabel}</button>
                              </form>
                            ) : product.purchaseMode === "book-service" ? (
                              <a className="appStorePurchaseLink" href={product.appHref}>Book service — {product.priceLabel}</a>
                            ) : (
                              <button className={inCart ? "isActive" : ""} type="button" onClick={() => toggleCart(product.id)}>
                                {inCart ? "Added to quote" : "Add to quote"}
                              </button>
                            )}
                            <a href={product.appHref}>Details</a>
                            <a href={product.skipHref} target="_blank" rel="noreferrer">Skip listing</a>
                            {product.purchaseMode === "quote-only" ? (
                              <button type="button" onClick={() => requestQuote([product.id])}>Request quote</button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="appStoreEmpty">
                  <h3>No matching products</h3>
                  <p>Try a different search term or clear the current category filter.</p>
                </div>
              )}
            </div>

            <aside className="appStoreCartPanel" id="build">
              <div className="appStoreCartHead">
                <p className="appStoreEyebrow">Quote builder</p>
                <h3>Your custom quote shortlist</h3>
                <p>Add quote-only items to compare the stack, estimate a starting total, and send a clean scope request to the ILLCO team.</p>
              </div>

              <div className="appStoreBuildShare" aria-label="Share this custom build desk">
                <div>
                  <span>Share custom build desk</span>
                  <strong>{appStoreBuildShareUrl}</strong>
                </div>
                <div className="appStoreBuildShareActions">
                  <button type="button" onClick={shareBuildDesk}>Share</button>
                  {shareLinks.map((link) => (
                    <a href={link.href} key={link.label} target="_blank" rel="noreferrer">{link.label}</a>
                  ))}
                  <button type="button" onClick={copyBuildShareLink}>Copy</button>
                </div>
                {shareStatus ? <p role="status">{shareStatus}</p> : null}
              </div>

              {!selectedProducts.length ? <div className="appStoreCartEmpty">Add quote-only items to compare the stack and estimate a starting total.</div> : null}

              <div className="appStoreCartItems" aria-live="polite">
                {selectedProducts.map((product) => (
                  <div className="appStoreCartItem" key={product.id}>
                    <div>
                      <strong>{product.title}</strong>
                      <button type="button" onClick={() => toggleCart(product.id)}>Remove</button>
                    </div>
                    <span>{product.category} - {product.priceLabel}</span>
                    <p>{product.summary}</p>
                  </div>
                ))}
              </div>

              <div className="appStoreCartSummary">
                <div><span>Quote items selected</span><strong>{selectedProducts.length}</strong></div>
                <div><span>Estimated starting total</span><strong>{money(cartTotal)}</strong></div>
              </div>

              <button className="appStoreBtn appStoreBtnPrimary" type="button" onClick={() => selectedProducts.length ? requestQuote([...cart]) : document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}>
                Request quote
              </button>
              <button className="appStoreBtn appStoreBtnSecondary" type="button" onClick={() => setCart(new Set())}>
                Clear quote
              </button>

              <p className="appStoreCartNote">
                Need a custom stack instead of a packaged build? Email <a href="mailto:admin@illcoai.tech">admin@illcoai.tech</a>.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="appStoreSection" id="support">
        <div className="appStoreWrap">
          <div className="appStoreConcierge">
            <div className="appStoreConciergeGrid">
              <div>
                <p className="appStoreEyebrow">Concierge build desk</p>
                <h2>Need a storefront, a workflow, or a full custom launch path?</h2>
                <p>Pick a packaged build if you want to move fast. Pick the custom lane if you need a scoped stack, a product migration, or a higher-touch admin setup.</p>
                <div className="appStoreHeroActions">
                  <a className="appStoreBtn appStoreBtnPrimary" href="mailto:admin@illcoai.tech?subject=Custom%20build%20request">Start a build brief</a>
                  <a className="appStoreBtn appStoreBtnSecondary" href="#catalog">Review the catalog</a>
                </div>
              </div>

              <div className="appStoreSteps">
                {[
                  ["1", "Choose the right lane", "Packaged app, automation bundle, support plan, or scoped custom build."],
                  ["2", "Review the stack", "Compare direct-buy products, managed services, and quote-only work before choosing the right next step."],
                  ["3", "Send the brief", "Use the quote request button or email admin@illcoai.tech for next steps."],
                ].map(([number, title, copy]) => (
                  <article className="appStoreStep" key={number}>
                    <span>{number}</span>
                    <div><strong>{title}</strong><p>{copy}</p></div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="appStoreFooter">
        <div className="appStoreWrap appStoreFooterInner">
          <div>
            <strong>ILLCO AI App Store</strong>
            <span>Working AI apps, automation systems, creative tools, growth products, and managed builds.</span>
          </div>
          <nav>
            <a href="#categories">Categories</a>
            <a href="#catalog">Catalog</a>
            <a href="#skip-proof">Skip proof</a>
            <a href="#skip-blog">Skip blog</a>
            <a href="#support">Support</a>
            <a href={skipProfileHref} target="_blank" rel="noreferrer">Helloskip</a>
            <a href="mailto:admin@illcoai.tech">admin@illcoai.tech</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
