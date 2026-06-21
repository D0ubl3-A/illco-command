import { checkoutProductCategories, checkoutProductCategoryDetails, checkoutProducts } from "@/lib/checkout-products";
import { getProductById, type ProductRecord } from "@/lib/deployments";
import { getConfigurationStatus } from "@/lib/env";
import { getMonetizationPlan } from "@/lib/monetization";
import { getProductViralImagePath } from "@/lib/product-marketing";
import { getProductModuleHref } from "@/lib/product-routes";
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
    "Define the business outcome and choose one measurable output.",
    "Open the helper and collect context in one pass.",
    "Generate a safe first attempt and review it.",
    "Capture action, owner, and next step.",
    "Execute repeatably and document what changed.",
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
    "Capture the request and define the output.",
    "Choose the right command or specialist lane.",
    "Run the first pass and confirm expected behavior.",
    "Track results and handoff to the next owner.",
    "Measure completion against the target outcome.",
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
  description = "Every listing resolves to an Illco module first. Finished products can be unlocked in-app; unfinished products stay in setup or coming-soon status.",
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
          <span>{visibleProducts.length} products</span>
          <span>{visibleCategories.length} lanes</span>
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
                  const appProduct = getProductById(product.appProductId);
                  const plan = appProduct ? getMonetizationPlan(appProduct.id) : null;
                  const moduleHref = appProduct ? getProductModuleHref(appProduct.id) : "/#request";
                  const moduleTarget = moduleHref.startsWith("http") ? "_blank" : undefined;
                  const imagePath = appProduct ? getProductViralImagePath(appProduct) : "/brand/illco-global-brand.png";
                  const productReady = Boolean(appProduct && canDirectCheckoutPublicProduct(appProduct.id));
                  const paymentConfigured = Boolean(plan && config.subscriptionsReady && config.planPrices[plan.funnelPlanId]);
                  const checkoutReady = Boolean(
                    appProduct &&
                      plan &&
                      productReady &&
                      paymentConfigured,
                  );
                  const statusLabel = checkoutReady ? "Unlock in app" : productReady ? "Payment setup" : appProduct ? "Coming soon" : "Setup required";
                  const processSteps = getCheckoutProductProcess(appProduct);

                  return (
                    <article className={`checkoutProductCard ${checkoutReady ? "isReady" : "isSetup"}`} key={product.id}>
                      <img className="checkoutProductThumb" src={imagePath} alt={`${product.name} product preview`} loading="lazy" />
                      <span>{product.category}</span>
                      <strong>{product.name}</strong>
                      <p>{product.summary}</p>
                      <em>{statusLabel}</em>
                      {processSteps.length ? (
                        <div className="accountNote">
                          <strong>Suggested process</strong>
                          <ol>
                            {processSteps.map((step, index) => (
                              <li key={`${product.id}-process-${index}`}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      ) : null}
                      <div className="checkoutProductActions">
                        <a className="button secondary" href={moduleHref} target={moduleTarget} rel={moduleTarget ? "noreferrer" : undefined}>
                          Open Product
                        </a>
                        {checkoutReady && plan && appProduct ? (
                          <form action="/api/subscriptions/checkout" method="post" className="inlineCheckoutForm">
                            <input type="hidden" name="planId" value={plan.funnelPlanId} />
                            <input type="hidden" name="productId" value={appProduct.id} />
                            <input type="hidden" name="returnTo" value={moduleHref} />
                            <button className="button primary" type="submit">
                              Unlock
                            </button>
                          </form>
                        ) : (
                          <a className="button primary" href={`${moduleHref}#request`}>
                            {productReady ? "Setup Payment" : "Request"}
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
