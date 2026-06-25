const commandPaymentUnlockProductIds = new Set([
  "illco-ai-video",
  "illcoai-video-generator-deploy",
]);

export function isCommandPaymentUnlockProduct(productId: string | null | undefined) {
  return commandPaymentUnlockProductIds.has(String(productId || "").trim());
}
