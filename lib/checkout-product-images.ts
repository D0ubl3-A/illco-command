import type { CheckoutProduct } from "@/lib/checkout-products";

const checkoutImageVersion = "2026-06-24-generator-assets-v1";

const generatedImageByCheckoutId: Record<string, string> = {
  "ai-music-mastering-pro": "mastering-studio-platform",
  "cinematic-ai-music-video-production": "illco-ai-video",
  "full-hd-lyric-videos": "lyric-video-forge",
  "youtube-rank-revival-ai-pro": "youtube-ops-vercel",
  "instant-lead-rescue-text-back-ai": "automateflow",
  "ai-workflow-mastery": "think-for-me-mode",
  "interactive-legacy-avatar-upgrade": "voice-book-tool",
  "testimonial-to-marketing-asset-generator": "ai-companion-content-production",
  "notion-research-clipper-ai-for-chrome": "notion-webhook",
  "linkedin-gmail-lead-sync-extension": "whatsapp-ai-bot",
  "notion-meeting-notes-assistant": "notion-api-webhook-repo",
  "chrome-proposal-generator": "ai-dev-co-funnel",
  "voicematch-ai-reply-copilot": "visual-voice-board",
  "rap-lyric-generator": "rap-lyric-generator",
  "song-analyzer-deploy": "songanalyzer-deploy",
  "t-shirt-workshop-pro-pc": "tshirtworkshop",
  "viral-stitch-ai": "viral-stitch-ai",
  "infinite-living-memory": "ghetto-bird-voice-ai",
  "voicebook-ai-studio": "ghettobirddemo",
  "website-to-android-app-conversion": "illcoappiverse",
  "vault-select-exclusive-trap-beat": "sora-vault-cloud",
  "barz-beat-shop": "barz-web-studio",
  "creator-crm-essentials": "ai-companion-sales-agent-handoff",
};

export function getCheckoutProductGeneratedImageId(product: CheckoutProduct) {
  return generatedImageByCheckoutId[product.id] || product.appProductId;
}

export function getCheckoutProductImagePath(product: CheckoutProduct) {
  const imageId = getCheckoutProductGeneratedImageId(product);
  return `/products/generated/${encodeURIComponent(imageId)}.jpg?v=${checkoutImageVersion}`;
}

export function getCheckoutProductVisualSignature(product: CheckoutProduct) {
  return getCheckoutProductGeneratedImageId(product);
}