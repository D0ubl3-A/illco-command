import assert from "node:assert/strict";
import test from "node:test";

import { products } from "../lib/deployments";
import { getProjectCompletionRecord, projectCompletionSummary } from "../lib/project-completion";
import { getProductViralImagePath } from "../lib/product-marketing";

test("project completion audit covers every product in the Commander registry", () => {
  assert.equal(projectCompletionSummary.checked, products.length);

  for (const product of products) {
    const completion = getProjectCompletionRecord(product.id);
    assert(completion, `${product.id} is missing from project completion audit`);
    assert.equal(completion.id, product.id);
  }
});

test("completed apps require both a healthy production URL and tracked source", () => {
  const completedProducts = products
    .map((product) => getProjectCompletionRecord(product.id))
    .filter((record) => record?.completionStatus === "complete");

  assert.equal(completedProducts.length, projectCompletionSummary.complete);
  assert(completedProducts.length > 0);

  for (const completion of completedProducts) {
    assert(completion);
    assert(completion.productionUrl, `${completion.id} has no production URL`);
    assert.equal(completion.health?.status, "healthy", `${completion.id} is not healthy`);
    assert(
      completion.localPaths.length > 0 || completion.githubRepos.length > 0,
      `${completion.id} has no tracked source`,
    );
  }
});

test("completed apps have product listing images", () => {
  const completedProducts = products.filter(
    (product) => getProjectCompletionRecord(product.id)?.completionStatus === "complete",
  );

  assert.equal(completedProducts.length, projectCompletionSummary.complete);

  for (const product of completedProducts) {
    assert.match(
      getProductViralImagePath(product) || "",
      /^\/(apps\/.+\/viral-image\.svg|products\/.+\.(svg|jpg))$/,
      `${product.id} needs a share-ready product image`,
    );
  }
});
