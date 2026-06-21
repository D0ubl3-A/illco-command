export const illMotionActivationNotice = {
  productId: "ill-motion-ai",
  title: "iLL-Motion activation can take up to 24 hours",
  body:
    "Video generation uses high-cost API credits and render capacity. We provision iLL-Motion access after purchase so paid jobs have enough credit headroom and do not stall mid-render.",
  meta: "Activation window: up to 24 hours after purchase confirmation.",
};

export function getProductNotice(productId: string) {
  if (productId === illMotionActivationNotice.productId) return illMotionActivationNotice;
  return null;
}
