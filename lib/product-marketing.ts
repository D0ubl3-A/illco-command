import { categoryLabels, customerProductName } from "@/lib/app-funnel";
import type { ProductRecord } from "@/lib/deployments";
import { getPreferredShowcaseVideo } from "@/lib/demo-videos";
import { getProductDisplayHref } from "@/lib/product-routes";
import { getProjectCompletionRecord } from "@/lib/project-completion";

const customProductImages: Record<string, string> = {
  automateflow: "/products/custom/instant-lead-rescue-text-back-ai.jpg",
  "ai-companion-command-routing": "/products/custom/think-for-me-mode-command-center.jpg",
  "ai-companion-conversational-intake": "/products/custom/instant-lead-rescue-text-back-ai.jpg",
  "ai-companion-sales-agent-handoff": "/products/custom/instant-lead-rescue-text-back-ai.jpg",
  "ai-music-mastering-pro": "/products/custom/ill-motion-ai-music-video.jpg",
  "barz-web-studio": "/products/custom/ill-motion-ai-music-video.jpg",
  "cinematic-ai-music-video-production": "/products/custom/ill-motion-ai-music-video.jpg",
  "codex-agent-app": "/products/custom/think-for-me-mode-command-center.jpg",
  "dj-curse-reverse": "/products/custom/dj-curse-reverse.jpg",
  "full-hd-lyric-videos": "/products/custom/ill-motion-ai-music-video.jpg",
  "godmode-ui": "/products/custom/think-for-me-mode-command-center.jpg",
  "ill-motion-ai": "/products/custom/ill-motion-ai-music-video.jpg",
  "illco-ai-video": "/products/custom/illcoai-video-generator-dashboard.jpg",
  "illcoai-video-generator-deploy": "/products/custom/illcoai-video-generator-dashboard.jpg",
  "lyric-video-forge": "/products/custom/ill-motion-ai-music-video.jpg",
  "mastering-studio-platform": "/products/custom/ill-motion-ai-music-video.jpg",
  "music-video-clip-site": "/products/custom/ill-motion-ai-music-video.jpg",
  "nexus-workstation": "/products/custom/think-for-me-mode-command-center.jpg",
  "rap-lyric-generator": "/products/custom/ill-motion-ai-music-video.jpg",
  "sora-catalog-vercel-preview": "/products/custom/illcoai-video-generator-dashboard.jpg",
  "sora-vault-cloud": "/products/custom/illcoai-video-generator-dashboard.jpg",
  "testimonial-to-marketing-asset-generator": "/products/custom/illcoai-video-generator-dashboard.jpg",
  "viral-stitch-ai": "/products/custom/youtube-ops-command-center.jpg",
  "voice-book-tool": "/products/custom/think-for-me-mode-command-center.jpg",
  "youtube-ops-vercel": "/products/custom/youtube-ops-command-center.jpg",
  "youtube-rank-revival-ai-pro": "/products/custom/youtube-ops-command-center.jpg",
};

export function getProductViralImagePath(product: ProductRecord) {
  const customImage = customProductImages[product.id];
  if (customImage) return customImage;

  const matchedImage = getProductImageFamilyPath(product);
  if (matchedImage) return matchedImage;

  return `/products/generated/${product.id}.jpg`;
}

function getProductImageFamilyPath(product: ProductRecord) {
  const key = `${product.id} ${product.name} ${product.displayName}`.toLowerCase();

  if (/(dj|serato|radio-edit|beat|audio|mastering|song|rap|barz)/.test(key)) {
    return product.id.includes("dj") || /serato|radio-edit|beat/.test(key)
      ? "/products/custom/dj-curse-reverse.jpg"
      : "/products/custom/ill-motion-ai-music-video.jpg";
  }

  if (/(lyric|music-video|ill-motion|lipsync|sora|video|clip|stitch|visual|slideshow|testimonial)/.test(key)) {
    return /youtube|rank|stitch/.test(key)
      ? "/products/custom/youtube-ops-command-center.jpg"
      : "/products/custom/illcoai-video-generator-dashboard.jpg";
  }

  if (/(youtube|creator|rank|content|publish|thumbnail)/.test(key)) {
    return "/products/custom/youtube-ops-command-center.jpg";
  }

  if (/(lead|crm|sales|proposal|gmail|linkedin|reply|whatsapp|intake|bot|flow|automate|funnel|pool|garden|airbnb|realtor|real-estate|rental)/.test(key)) {
    return "/products/custom/instant-lead-rescue-text-back-ai.jpg";
  }

  if (/(codex|agent|command|ops|workspace|workstation|nexus|gateway|hq|admin|godmode|tool|appiverse|platform|enterprise)/.test(key)) {
    return "/products/custom/think-for-me-mode-command-center.jpg";
  }

  if (product.category === "realEstate") return "/products/custom/instant-lead-rescue-text-back-ai.jpg";
  if (product.category === "media") return "/products/custom/illcoai-video-generator-dashboard.jpg";
  if (product.category === "automation" || product.category === "commerce") return "/products/custom/instant-lead-rescue-text-back-ai.jpg";
  if (product.category === "command" || product.category === "backend" || product.category === "experimental") return "/products/custom/think-for-me-mode-command-center.jpg";

  return null;
}

export function getProductListingKicker(product: ProductRecord) {
  const completion = getProjectCompletionRecord(product.id);
  if (completion?.completionStatus === "complete") return "Completed Project Listing";
  if (product.isLive) return "In-App Module Listing";
  return "Guided Setup Listing";
}

export function getProductViralImageSvg(product: ProductRecord) {
  const completion = getProjectCompletionRecord(product.id);
  const name = customerProductName(product);
  const category = categoryLabels[product.category];
  const status = completion?.completionStatus === "complete" ? "COMPLETED PROJECT" : product.isLive ? "ILLCO MODULE" : "SETUP PATH";
  const source = completion?.sourceStatus ? completion.sourceStatus.replace(/-/g, " ").toUpperCase() : "SOURCE TRACKED";
  const url = getProductDisplayHref(product.id);
  const theme = themeForProduct(product);
  const titleLines = splitSvgTitle(name, 16, 3);
  const titleSize = titleLines.length > 2 ? 58 : titleLines.length > 1 ? 68 : 82;
  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<text x="0" y="${index * (titleSize + 12)}" fill="#f4f4f4" font-family="'Segoe UI', Arial, sans-serif" font-size="${titleSize}" font-weight="900">${escapeSvg(line)}</text>`,
    )
    .join("");
  const subtitleY = titleLines.length * (titleSize + 12) + 22;
  const packageWord = getProductPackageWord(product);
  const featureMarkup = getProductFeatureLines(product)
    .map(
      (line, index) =>
        `<g transform="translate(0 ${index * 52})">
      <rect x="0" y="-18" width="14" height="14" rx="4" fill="url(#gold)"/>
      <path d="M3.6 -11.7 6.4 -9 10.7 -13.3" stroke="#0b0a08" stroke-width="2.2" fill="none"/>
      <text x="28" y="0" fill="#d8d0be" font-family="'Segoe UI', Arial, sans-serif" font-size="27" font-weight="700">${escapeSvg(line)}</text>
    </g>`,
    )
    .join("");
  const sourceLine = source.length > 28 ? `${source.slice(0, 28)}...` : source;
  const pathLine = url.length > 28 ? `${url.slice(0, 28)}...` : url;
  const demoVideo = getPreferredShowcaseVideo(product.id);
  const demoStatusLabel = demoVideo?.youtubeVideoId
    ? "VIDEO DEMO READY"
    : product.isLive
      ? "PROOF PENDING"
      : "SETUP PREVIEW";
  const demoFrameMarkup = demoVideo?.youtubeVideoId
    ? getDemoVideoFrameMarkup(demoVideo.youtubeVideoId, theme)
    : getFallbackDeviceFrameMarkup(theme);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc">
  <title id="title">${escapeSvg(name)} product image</title>
  <desc id="desc">A premium software package image for ${escapeSvg(name)}.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#040509"/>
      <stop offset=".38" stop-color="${theme.bgA}"/>
      <stop offset="1" stop-color="#05070d"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.accentA}"/>
      <stop offset="1" stop-color="${theme.accentB}"/>
    </linearGradient>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#111621"/>
      <stop offset=".4" stop-color="#0e1523"/>
      <stop offset="1" stop-color="#151d2d"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1018"/>
      <stop offset=".56" stop-color="#07090e"/>
      <stop offset="1" stop-color="#05070e"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f5f2eb"/>
      <stop offset=".38" stop-color="#d3ccb8"/>
      <stop offset=".74" stop-color="#b09b63"/>
      <stop offset="1" stop-color="#f8f6f1"/>
    </linearGradient>
    <radialGradient id="lens" cx="50%" cy="42%" r="64%">
      <stop offset="0" stop-color="#f3efdc" stop-opacity=".16"/>
      <stop offset=".34" stop-color="${theme.accentA}" stop-opacity=".26"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="coinGlow" cx="40%" cy="33%" r="70%">
      <stop offset="0" stop-color="#d4b95f" stop-opacity=".36"/>
      <stop offset=".78" stop-color="#3f2f0f" stop-opacity=".18"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="34" stdDeviation="30" flood-color="#000000" flood-opacity=".52"/>
      <feDropShadow dx="0" dy="0" stdDeviation="14" flood-color="${theme.accentA}" flood-opacity=".24"/>
    </filter>
    <filter id="fineGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="9" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="20" flood-color="${theme.accentA}" flood-opacity=".48"/>
    </filter>
    <pattern id="grain" width="110" height="110" patternUnits="userSpaceOnUse">
      <rect width="110" height="110" fill="#ffffff" opacity=".015"/>
      <circle cx="18" cy="29" r="1.2" fill="#ffffff" opacity=".08"/>
      <circle cx="74" cy="18" r="1" fill="#ffffff" opacity=".06"/>
      <circle cx="46" cy="84" r="1.4" fill="#ffffff" opacity=".045"/>
    </pattern>
  </defs>

  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect width="1600" height="900" fill="url(#lens)"/>
  <rect width="1600" height="900" fill="url(#grain)" opacity=".42"/>
  <path d="M-80 705 C 230 520, 390 820, 710 642 S 1050 342, 1398 488 1588 604, 1700 392" fill="none" stroke="${theme.accentA}" stroke-opacity=".22" stroke-width="6"/>
  <path d="M-40 180 C 190 320, 408 78, 646 205 S 1018 484, 1640 104" fill="none" stroke="${theme.accentB}" stroke-opacity=".14" stroke-width="4"/>

  <g transform="translate(72 56)" filter="url(#softShadow)">
    <rect x="0" y="0" width="1452" height="782" rx="58" fill="#07090f" stroke="#f4ebce" stroke-opacity=".14"/>
    <rect x="29" y="29" width="1394" height="724" rx="44" fill="url(#panel)" stroke="#ffffff" stroke-opacity=".11"/>
    <g transform="translate(52 52)">
      <rect x="0" y="0" width="1260" height="84" rx="22" fill="#0f1118" stroke="#ffdc9b" stroke-opacity=".17"/>
      <text x="28" y="56" fill="${theme.accentA}" font-family="'Segoe UI', Arial, sans-serif" font-size="28" font-weight="900" letter-spacing="2">${escapeSvg(status)} / LIVE FOCUS</text>
      <rect x="920" y="26" width="300" height="36" rx="18" fill="url(#gold)"/>
      <text x="952" y="52" fill="#0f0b06" font-family="'Segoe UI', Arial, sans-serif" font-size="21" font-weight="900">ILLCO SOFTWARE</text>
    </g>
  </g>

  <g transform="translate(154 188)">
    <text x="0" y="0" fill="${theme.accentA}" font-family="'Brush Script MT', 'Segoe Script', cursive" font-size="52" font-weight="500" letter-spacing="6">${escapeSvg(packageWord)}</text>
    <text x="0" y="86" fill="url(#metal)" font-family="'Garamond', 'Times New Roman', serif" font-size="82" font-weight="900">${escapeSvg(packageWord)} PACKAGE</text>
    <text x="0" y="152" fill="#f2e8ce" font-family="'Segoe UI', Arial, sans-serif" font-size="29" font-weight="800">${escapeSvg(`${product.subscriptionTier} / ${category}`)}</text>
    <g transform="translate(0 184)">${titleMarkup}</g>
    <g transform="translate(0 ${subtitleY + 180})">
      <rect width="620" height="2" fill="url(#gold)"/>
      <text x="0" y="40" fill="#d8c7a5" font-family="'Segoe UI', Arial, sans-serif" font-size="31" font-weight="700">${escapeSvg(sourceLine)}</text>
      <text x="0" y="82" fill="#a7b1c2" font-family="'Segoe UI', Arial, sans-serif" font-size="26" font-weight="600">${escapeSvg(pathLine)}</text>
    </g>
    <g transform="translate(0 560)">${featureMarkup}</g>
    <g transform="translate(0 790)" filter="url(#goldGlow)">
      <rect width="1260" height="64" rx="34" fill="url(#gold)"/>
      <text x="36" y="44" fill="#1b140f" font-family="'Segoe UI', Arial, sans-serif" font-size="28" font-weight="900">SPEND CREDITS • CREATE IMMEDIATE VALUE • ACCESS THE APP</text>
    </g>
  </g>

  <g transform="translate(1068 236)">
    <rect x="0" y="0" width="410" height="520" rx="34" fill="#070a10" stroke="url(#gold)" stroke-opacity=".5"/>
    ${demoFrameMarkup}
    <g transform="translate(20 306)">
      <text x="0" y="0" fill="#f2d9a6" font-family="'Segoe UI', Arial, sans-serif" font-size="21" font-weight="900" letter-spacing="2">FLOW</text>
      <rect x="0" y="18" width="368" height="20" rx="10" fill="#111826"/>
      <rect x="0" y="48" width="302" height="20" rx="10" fill="#111826"/>
      <rect x="0" y="78" width="343" height="20" rx="10" fill="#111826"/>
      <rect x="0" y="108" width="272" height="20" rx="10" fill="#111826"/>
      <rect x="0" y="138" width="350" height="20" rx="10" fill="#111826"/>
    </g>
    <g transform="translate(26 444)">
      <rect x="0" y="0" width="352" height="36" rx="16" fill="${theme.accentB}" opacity=".18"/>
      <text x="16" y="25" fill="#ecddc5" font-family="'Segoe UI', Arial, sans-serif" font-size="20" font-weight="900">${escapeSvg(demoStatusLabel)}</text>
    </g>
  </g>

  <g transform="translate(520 468)" filter="url(#goldGlow)">
    <rect x="0" y="-8" width="210" height="130" rx="60" fill="#06080e" stroke="${theme.accentA}" stroke-opacity=".42"/>
    <rect x="12" y="0" width="186" height="130" rx="56" fill="url(#coinGlow)"/>
    <g transform="translate(24 14)">
      <ellipse cx="86" cy="18" rx="72" ry="20" fill="#111a25"/>
      <ellipse cx="86" cy="24" rx="72" ry="20" fill="#4b3c16" opacity=".7"/>
      <ellipse cx="86" cy="30" rx="72" ry="20" fill="url(#gold)" opacity=".82"/>
      <ellipse cx="86" cy="32" rx="72" ry="20" fill="#e6d4a5" opacity=".38"/>
      <text x="18" y="42" fill="#120c06" font-family="'Segoe UI', Arial, sans-serif" font-size="34" font-weight="900" letter-spacing="2">CREDITS</text>
      <g transform="translate(56 64)">
        <rect x="0" y="0" width="60" height="28" rx="14" fill="#0c1016" stroke="#d2b35f" stroke-opacity=".55"/>
        <ellipse cx="30" cy="42" rx="28" ry="7" fill="#3f3621" opacity=".7"/>
        <rect x="30" y="6" width="20" height="26" fill="#f5e7cb"/>
      </g>
    </g>
  </g>

  <rect x="96" y="96" width="1408" height="708" rx="46" fill="none" stroke="#f4ebd8" stroke-opacity=".08"/>
</svg>`;
}

function getDemoVideoFrameMarkup(youtubeVideoId: string, theme: ReturnType<typeof themeForProduct>) {
  const thumbnailUrl = `https://i.ytimg.com/vi/${encodeURIComponent(youtubeVideoId)}/hqdefault.jpg`;
  return `<g>
    <clipPath id="demoFrameClip">
      <rect x="20" y="20" width="362" height="210" rx="24"/>
    </clipPath>
    <rect x="20" y="20" width="362" height="210" rx="24" fill="#03060c"/>
    <image x="20" y="20" width="362" height="210" href="${thumbnailUrl}" preserveAspectRatio="xMidYMid slice" clip-path="url(#demoFrameClip)"/>
    <rect x="20" y="20" width="362" height="210" rx="24" fill="#02040a" opacity=".16"/>
    <circle cx="201" cy="125" r="42" fill="#050914" opacity=".72" stroke="${theme.accentA}" stroke-opacity=".72" stroke-width="3"/>
    <path d="M187 101 187 149 229 125Z" fill="#ffffff"/>
    <rect x="44" y="42" width="136" height="28" rx="14" fill="#050914" opacity=".78" stroke="${theme.accentB}" stroke-opacity=".48"/>
    <text x="62" y="62" fill="#ffffff" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="900" letter-spacing="2">DEMO VIDEO</text>
    <rect x="40" y="242" width="344" height="18" rx="9" fill="#050914" opacity=".74"/>
    <rect x="40" y="242" width="236" height="18" rx="9" fill="${theme.accentA}" opacity=".86"/>
  </g>`;
}

function getFallbackDeviceFrameMarkup(theme: ReturnType<typeof themeForProduct>) {
  return `<g>
    <rect x="20" y="20" width="362" height="210" rx="24" fill="#03060c"/>
    <rect x="66" y="70" width="270" height="130" rx="20" fill="${theme.accentB}" opacity=".14"/>
    <path d="M70 182 112 102 150 184 190 122 232 182 270 130 330 182Z" fill="url(#gold)" opacity=".82"/>
  </g>`;
}

function getProductPackageWord(product: ProductRecord) {
  if (product.id === "illusion-landing-pages") return "CREATIVE";
  if (product.category === "media") return "VIDEO";
  if (product.category === "automation") return "FLOW";
  if (product.category === "commerce") return "SALES";
  if (product.category === "realEstate") return "RENTAL";
  if (product.category === "backend") return "API";
  if (product.category === "command") return "SYSTEM";
  return "PRODUCT";
}

function getProductFeatureLines(product: ProductRecord) {
  if (product.category === "media") {
    return ["Sora-ready clips", "Fast script engine", "Frame-level demo", "Direct delivery"];
  }
  if (product.category === "automation") {
    return ["Input to output automation", "Lead routing", "Escalation + handoff", "Runs 24/7"];
  }
  if (product.category === "commerce") {
    return ["Checkout-ready output", "Delivery + invoice logic", "Smart upsells", "Campaign-ready assets"];
  }
  if (product.category === "realEstate") {
    return ["Listing automation", "Lead qualification", "CRM-style structure", "On-demand reports"];
  }
  if (product.category === "backend") {
    return ["Reliable API layer", "Secure queueing", "Webhook support", "Audit trails"];
  }
  if (product.category === "command") {
    return ["Tool orchestration", "Model-aware prompts", "Task handoff", "One-click launch"];
  }
  return ["Premium workflow", "Clear output artifact", "Brand-safe visuals", "Production delivery"];
}

function themeForProduct(product: ProductRecord) {
  if (product.category === "media") {
    return { bgA: "#170918", bgB: "#101b31", accentA: "#ff4f9a", accentB: "#44eaff" };
  }
  if (product.category === "commerce") {
    return { bgA: "#120d05", bgB: "#152416", accentA: "#ffba3a", accentB: "#58f069" };
  }
  if (product.category === "realEstate") {
    return { bgA: "#07140f", bgB: "#101f2a", accentA: "#59f08a", accentB: "#9bdfff" };
  }
  if (product.category === "backend") {
    return { bgA: "#060d19", bgB: "#11142c", accentA: "#9bdfff", accentB: "#8f7cff" };
  }
  if (product.category === "automation") {
    return { bgA: "#06131a", bgB: "#161b25", accentA: "#44eaff", accentB: "#e1ff18" };
  }
  if (product.category === "command") {
    return { bgA: "#050b14", bgB: "#15120b", accentA: "#e1ff18", accentB: "#44eaff" };
  }
  return { bgA: "#100b18", bgB: "#111827", accentA: "#c084fc", accentB: "#44eaff" };
}

function splitSvgTitle(value: string, maxLineLength: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const clipped = lines.slice(0, maxLines);
  clipped[maxLines - 1] = `${clipped[maxLines - 1]}...`;
  return clipped;
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

