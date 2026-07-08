import { checkoutProductCategories, checkoutProductCategoryDetails, checkoutProducts } from "@/lib/checkout-products";
import { getCheckoutProductImagePath } from "@/lib/checkout-product-images";
import { getProductById, type ProductRecord } from "@/lib/deployments";
import { getConfigurationStatus } from "@/lib/env";
import { getMonetizationPlan } from "@/lib/monetization";
import { getProductModuleHref, isPublicProductLaunchHref } from "@/lib/product-routes";
import { storefrontPriceLabel, storefrontProductImage } from "@/lib/storefront";
import { canDirectCheckoutPublicProduct } from "@/lib/public-checkout";

type CheckoutProductsSectionProps = {
  productIds?: string[];
  categoryFilter?: Array<(typeof checkoutProductCategories)[number]>;
  eyebrow?: string;
  title?: string;
  description?: string;
};

const checkoutProductProcessById: Record<string, string[]> = {
  "think-for-me-mode": [
    "Define the objective and what outcome defines success.",
    "Collect context, constraints, source files, and guardrails in one pass.",
    "Run the operator to generate a ready-to-execute plan.",
    "Review and refine the plan before first execution.",
    "Assign owners, priorities, and a review checkpoint.",
    "Execute once, then capture lessons for the next cycle.",
  ],
  "ai-companion-conversational-intake": [
    "Capture the user context and source.",
    "Normalize it to one internal lane and request type.",
    "Route to the right workflow and record routing notes.",
    "Keep follow-up visible in one dashboard.",
    "Escalate edge cases through confirmation flow.",
  ],
};

const checkoutProductProcessByCategory: Record<ProductRecord["category"], string[]> = {
  command: [
    "Define the business objective and measurable outcome.",
    "Gather context, constraints, and source inputs.",
    "Run the Operator path to generate the first execution plan.",
    "Review, harden, and assign ownership to action owners.",
    "Execute quickly and reuse the winning playbook across future runs.",
  ],
  media: [
    "Collect source files and output format.",
    "Run generation/editing workflow with checkpoints.",
    "Review quality and brand fit.",
    "Export with correct metadata and delivery notes.",
    "Push to distribution or handoff with receipts.",
  ],
  automation: [
    "Map the trigger, input, and expected output.",
    "Set owner, escalation, and failure handling.",
    "Connect required channels and tools.",
    "Run test traffic and verify repeatability.",
    "Tune rules to reduce manual exceptions.",
  ],
  commerce: [
    "Define offer, checkout, and payment path.",
    "Run a test order or lead conversion flow.",
    "Validate confirmation, receipt, and notifications.",
    "Confirm support handoff and post-purchase routing.",
    "Measure close rate and reduce dropped steps.",
  ],
  realEstate: [
    "Collect listing or service context.",
    "Assign owner, status, and follow-up schedule.",
    "Coordinate proof, tour flow, or media requirements.",
    "Confirm communication cadence and updates.",
    "Close or recycle each opportunity with notes.",
  ],
  backend: [
    "Define endpoint contracts and auth requirements.",
    "Validate payload and error contracts.",
    "Monitor execution, retries, and response quality.",
    "Capture logs and ownership for fallback paths.",
    "Harden after baseline success.",
  ],
  experimental: [
    "Define a test scope and explicit success criteria.",
    "Build minimal flow with clear limits.",
    "Collect feedback and document known constraints.",
    "Run checks and compare observed results.",
    "Iterate only once baseline behavior is proven.",
  ],
};

export function CheckoutProductsSection({
  productIds,
  categoryFilter,
  eyebrow = "Direct Checkout",
  title = "Check Out Our Products",
  description = "Pick a proven AI system that improves planning, decision-making, and execution without you rebuilding processes from scratch.",
}: CheckoutProductsSectionProps = {}) {
  const config = getConfigurationStatus();
  const productIdSet = productIds ? new Set(productIds) : null;
  const categorySet = categoryFilter ? new Set(categoryFilter) : null;
  const visibleProducts = checkoutProducts.filter((product) => {
    if (productIdSet) return productIdSet.has(product.id);
    if (categorySet) return categorySet.has(product.category);
    return true;
  });
  const visibleCategories = checkoutProductCategories.filter((category) =>
    visibleProducts.some((product) => product.category === category),
  );

  return (
    <section id="checkout-products" className="checkoutProductsSection" aria-labelledby="checkout-products-title">
      <div className="checkoutProductsHeader">
        <div>
          <p className="checkoutProductsEyebrow">{eyebrow}</p>
          <h2 id="checkout-products-title">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="checkoutProductsStats" aria-label="Checkout catalog summary">
          <span>{visibleProducts.length} tools</span>
          <span>{visibleCategories.length} categories</span>
        </div>
      </div>

      <div className="checkoutProductGroups">
        {visibleCategories.map((category) => {
          const products = visibleProducts.filter((product) => product.category === category);
          return (
            <section className="checkoutProductGroup" aria-label={`${category} products`} key={category}>
              <header className="checkoutProductGroupHeader">
                <div>
                  <h3>{category}</h3>
                  <p>{checkoutProductCategoryDetails[category]}</p>
                </div>
                <span>{products.length} listings</span>
              </header>
              <div className="checkoutProductGrid">
                {products.map((product) => {
                  const offerProduct = getProductById(product.id);
                  const appProduct = getProductById(product.appProductId) || offerProduct;
                  const priceProduct = offerProduct || appProduct;
                  const plan = appProduct ? getMonetizationPlan(appProduct.id) : null;
                  const moduleHref = appProduct ? getProductModuleHref(appProduct.id) : "/#request";
                  const appLandingHref = appProduct ? `/apps/${encodeURIComponent(appProduct.id)}` : "/#request";
                  const moduleTarget = moduleHref.startsWith("http") ? "_blank" : undefined;
                  const imagePath = offerProduct ? storefrontProductImage(offerProduct) : getCheckoutProductImagePath(product);
                  const imageHref = offerProduct ? `/apps/${encodeURIComponent(offerProduct.id)}` : appLandingHref;
                  const priceLabel = priceProduct ? storefrontPriceLabel(priceProduct) : "Custom";
                  const productReady = Boolean(appProduct && canDirectCheckoutPublicProduct(appProduct.id));
                  const paymentConfigured = Boolean(plan && config.subscriptionsReady && config.planPrices[plan.funnelPlanId]);
                  const checkoutReady = Boolean(
                    appProduct &&
                      plan &&
                      productReady &&
                      paymentConfigured,
                  );
                  const publicLaunchReady = checkoutReady && isPublicProductLaunchHref(moduleHref);
                  const checkoutReturnTo = publicLaunchReady ? moduleHref : appLandingHref;
                  const statusLabel = checkoutReady ? "Ready to unlock" : "Coming Soon";
                  const processSteps = getCheckoutProductProcess(appProduct);

                  return (
                    <article className={`checkoutProductCard ${checkoutReady ? "isReady" : "isSetup"}`} key={product.id}>
                      <a className="checkoutProductImageLink" href={imageHref} aria-label={`View ${product.name} details`}>
                        <img className="checkoutProductThumb" src={imagePath} alt={`${product.name} product preview`} loading="lazy" />
                      </a>
                      <span>{product.category}</span>
                      <strong>{product.name}</strong>
                      <div className="checkoutProductPrice">{priceLabel}</div>
                      <p>{product.summary}</p>
                      <em>{statusLabel}</em>
                      {processSteps.length ? (
                        <div className="accountNote">
                          <strong>How it works</strong>
                          <ol>
                            {processSteps.map((step, index) => (
                              <li key={`${product.id}-process-${index}`}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      ) : null}
                      <div className="checkoutProductActions">
                        {publicLaunchReady ? (
                          <a className="button secondary" href={moduleHref} target={moduleTarget} rel={moduleTarget ? "noreferrer" : undefined}>
                            Open Product
                          </a>
                        ) : (
                          <a className="button secondary" href={appLandingHref}>
                            Details
                          </a>
                        )}
                        {checkoutReady && plan && appProduct ? (
                          <form action="/api/subscriptions/checkout" method="post" className="inlineCheckoutForm">
                            <input type="hidden" name="planId" value={plan.funnelPlanId} />
                            <input type="hidden" name="productId" value={appProduct.id} />
                            <input type="hidden" name="returnTo" value={checkoutReturnTo} />
                            <button className="button primary" type="submit">
                              Unlock
                            </button>
                          </form>
                        ) : (
                          <a className="button primary" href={`${appLandingHref}#request`}>
                            Coming Soon
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function getCheckoutProductProcess(product: ProductRecord | null) {
  if (!product) return [];
  const override = checkoutProductProcessById[product.id];
  if (override) return override;
  return checkoutProductProcessByCategory[product.category];
}
