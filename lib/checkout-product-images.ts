import type { CheckoutProduct } from "@/lib/checkout-products";

const checkoutImageVersion = "2026-06-30-alternate-colors-top10-v1";

const latestZipImageByCheckoutId: Record<string, string> = {
  "ai-music-mastering-pro": "ai-music-mastering-pro",
  "cinematic-ai-music-video-production": "cinematic-ai-music-video-production",
  "full-hd-lyric-videos": "full-hd-lyric-videos",
  "youtube-rank-revival-ai-pro": "youtube-rank-revival-ai-pro",
  "instant-lead-rescue-text-back-ai": "instant-lead-rescue-text-back-ai",
  "ai-workflow-mastery": "ai-workflow-mastery",
  "interactive-legacy-avatar-upgrade": "interactive-legacy-avatar-upgrade",
  "testimonial-to-marketing-asset-generator": "testimonial-to-marketing-asset-generator",
  "notion-research-clipper-ai-for-chrome": "notion-research-clipper-ai-for-chrome",
  "linkedin-gmail-lead-sync-extension": "linkedin-gmail-lead-sync-extension",
};
const generatedImageByCheckoutId: Record<string, string> = {
  "doomsday-command": "think-for-me-mode",
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
  "vocal-visualizer": "lyricflow-ai",
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
  const latestZipImageId = latestZipImageByCheckoutId[product.id];
  const imageId = latestZipImageId || getCheckoutProductGeneratedImageId(product);
  return `/products/generated/${encodeURIComponent(imageId)}.jpg?v=${checkoutImageVersion}`;
}

export function getCheckoutProductVisualSignature(product: CheckoutProduct) {
  return latestZipImageByCheckoutId[product.id] || getCheckoutProductGeneratedImageId(product);
}
