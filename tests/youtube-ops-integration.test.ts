import assert from "node:assert/strict";
import test from "node:test";

process.env.CHECKOUT_SESSION_SECRET = "youtube-ops-bridge-test-secret";

test("YouTube Ops uses ILLCO account bridge and checkout URLs", async () => {
  const {
    YOUTUBE_OPS_APP_URL,
    YOUTUBE_OPS_PRODUCT_ID,
    getYoutubeOpsBridgeStartHref,
    getYoutubeOpsCheckoutHref,
  } = await import("../lib/youtube-ops-integration");

  const bridgeUrl = new URL(getYoutubeOpsBridgeStartHref("https://illcoai.tech"));
  assert.equal(bridgeUrl.origin, "https://illcoai.tech");
  assert.equal(bridgeUrl.pathname, "/api/account/bridge/start");
  assert.equal(bridgeUrl.searchParams.get("productId"), YOUTUBE_OPS_PRODUCT_ID);
  assert.equal(bridgeUrl.searchParams.get("returnTo"), YOUTUBE_OPS_APP_URL);

  const checkoutUrl = new URL(getYoutubeOpsCheckoutHref("https://illcoai.tech"));
  assert.equal(checkoutUrl.origin, "https://illcoai.tech");
  assert.equal(checkoutUrl.pathname, "/api/youtube-ops/checkout");
  assert.equal(checkoutUrl.searchParams.get("returnTo"), YOUTUBE_OPS_APP_URL);
});

test("account bridge CORS allows the YouTube Ops app", async () => {
  const { accountBridgeCorsHeaders } = await import("../lib/account-bridge-cors");

  const headers = accountBridgeCorsHeaders("https://youtubeopsvercel.vercel.app");
  assert.equal(headers["Access-Control-Allow-Origin"], "https://youtubeopsvercel.vercel.app");
  assert.equal(headers["Access-Control-Allow-Methods"], "POST, OPTIONS");
});

test("YouTube Ops marketplace launch uses the ILLCO account bridge", async () => {
  const { YOUTUBE_OPS_APP_URL, YOUTUBE_OPS_PRODUCT_ID } = await import("../lib/youtube-ops-integration");
  const { getProductModuleHref } = await import("../lib/product-routes");

  const href = new URL(getProductModuleHref(YOUTUBE_OPS_PRODUCT_ID), "https://illcoai.tech");
  assert.equal(href.pathname, "/api/account/bridge/start");
  assert.equal(href.searchParams.get("productId"), YOUTUBE_OPS_PRODUCT_ID);
  assert.equal(href.searchParams.get("returnTo"), YOUTUBE_OPS_APP_URL);
});