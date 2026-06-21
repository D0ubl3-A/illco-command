import { categoryLabels, customerProductName } from "@/lib/app-funnel";
import type { ProductRecord } from "@/lib/deployments";
import { getPreferredShowcaseVideo } from "@/lib/demo-videos";
import { getProductDisplayHref } from "@/lib/product-routes";
import { getProjectCompletionRecord } from "@/lib/project-completion";

const customProductImages: Record<string, string> = {
  "lyric-video-forge": "/images/lyric-video-forge-credits.png",
};

export function getProductViralImagePath(product: ProductRecord) {
  const customImage = customProductImages[product.id];
  if (customImage) return customImage;
  return `/products/generated/${product.id}.jpg`;
}

export function getProductListingKicker(product: ProductRecord) {
  const completion = getProjectCompletionRecord(product.id);
  if (completion?.completionStatus === "complete") return "Completed Project Listing";
  if (product.isLive) return "In-App Module Listing";
  return "Guided Setup Listing";
}

export function getProductViralImageSvg(product: ProductRecord) {
  if (product.id === "vault-select-exclusive-trap-beat" || product.id === "barz-beat-shop") {
    return getMusicPopProductSvg(product);
  }

  const completion = getProjectCompletionRecord(product.id);
  const name = customerProductName(product);
  const category = categoryLabels[product.category];
  const status = completion?.completionStatus === "complete" ? "COMPLETED PROJECT" : product.isLive ? "ILLCO MODULE" : "SETUP PATH";
  const source = completion?.sourceStatus ? completion.sourceStatus.replace(/-/g, " ").toUpperCase() : "SOURCE TRACKED";
  const url = getProductDisplayHref(product.id);
  const theme = themeForProduct(product);
  const titleLines = splitSvgTitle(name, 14, 4);
  const titleSize =
    titleLines.length > 3
      ? 52
      : titleLines.length > 2
        ? 58
        : titleLines.length > 1
          ? 68
          : name.length > 14
            ? 76
            : 88;
  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<text x="0" y="${index * (titleSize + 8)}" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="${titleSize}" font-weight="950">${escapeSvg(line)}</text>`,
    )
    .join("");
  const subtitleY = titleLines.length * (titleSize + 8) + 16;
  const deviceTone = product.category === "media" ? "VIDEO ENGINE" : product.category === "automation" ? "AGENT ENGINE" : product.category === "commerce" ? "SALES ENGINE" : "APP ENGINE";
  const demoVideo = getPreferredShowcaseVideo(product.id);
  const demoFrameMarkup = demoVideo?.youtubeVideoId ? getDemoVideoFrameMarkup(demoVideo.youtubeVideoId, theme) : getFallbackDeviceFrameMarkup(theme);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc">
  <title id="title">${escapeSvg(name)} viral product image</title>
  <desc id="desc">A premium ILLCO AI product image for ${escapeSvg(name)}.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#040509"/>
      <stop offset=".38" stop-color="${theme.bgA}"/>
      <stop offset="1" stop-color="#05070d"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.accentA}"/>
      <stop offset="1" stop-color="${theme.accentB}"/>
    </linearGradient>
    <radialGradient id="lens" cx="50%" cy="42%" r="64%">
      <stop offset="0" stop-color="${theme.accentA}" stop-opacity=".34"/>
      <stop offset=".36" stop-color="${theme.accentB}" stop-opacity=".16"/>
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
  <path d="M-80 705 C 230 520, 390 820, 710 642 S 1050 342, 1398 488 1588 604, 1700 392" fill="none" stroke="${theme.accentA}" stroke-opacity=".34" stroke-width="5"/>
  <path d="M-40 180 C 190 320, 408 78, 646 205 S 1018 484, 1640 104" fill="none" stroke="${theme.accentB}" stroke-opacity=".22" stroke-width="4"/>
  <g transform="translate(952 116)" filter="url(#softShadow)">
    <rect x="0" y="0" width="548" height="656" rx="54" fill="#080d16" stroke="#ffffff" stroke-opacity=".16"/>
    <rect x="28" y="28" width="492" height="600" rx="38" fill="#101722" stroke="url(#accent)" stroke-opacity=".44"/>
    ${demoFrameMarkup}
    <g transform="translate(62 360)">
      <rect width="184" height="20" rx="10" fill="#ffffff" opacity=".18"/>
      <rect y="48" width="358" height="18" rx="9" fill="${theme.accentA}" opacity=".72"/>
      <rect y="90" width="280" height="18" rx="9" fill="#ffffff" opacity=".16"/>
      <rect y="132" width="394" height="18" rx="9" fill="#ffffff" opacity=".12"/>
    </g>
    <g transform="translate(64 548)">
      <rect width="158" height="48" rx="18" fill="url(#accent)"/>
      <rect x="184" width="188" height="48" rx="18" fill="#ffffff" opacity=".1"/>
    </g>
  </g>
  <g transform="translate(92 94)">
    <g filter="url(#fineGlow)">
      <rect width="86" height="86" rx="23" fill="#070b12" stroke="${theme.accentA}" stroke-opacity=".62"/>
      <path d="M24 22 46 10v35L24 58V22Z" fill="${theme.accentB}"/>
      <path d="M56 22 78 35 56 48V22Z" fill="${theme.accentA}"/>
      <path d="M26 66 46 54l20 12-20 12-20-12Z" fill="#ffffff" opacity=".88"/>
    </g>
    <text x="112" y="34" fill="${theme.accentB}" font-family="Inter, Arial, sans-serif" font-size="23" font-weight="900" letter-spacing="5">${escapeSvg(status)}</text>
    <text x="112" y="72" fill="#f6fbff" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="850">ILLCO AI / ${escapeSvg(deviceTone)}</text>
    <g transform="translate(0 196)">
      ${titleMarkup}
      <text x="0" y="${subtitleY}" fill="#dce6f3" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="760">${escapeSvg(category)} / ${escapeSvg(product.subscriptionTier)} access</text>
    </g>
    <g transform="translate(0 586)">
      <rect width="344" height="84" rx="24" fill="#ffffff" fill-opacity=".08" stroke="#ffffff" stroke-opacity=".12"/>
      <text x="24" y="34" fill="${theme.accentA}" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="900">SOURCE</text>
      <text x="24" y="62" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="850">${escapeSvg(source)}</text>
      <rect x="376" width="344" height="84" rx="24" fill="#ffffff" fill-opacity=".08" stroke="#ffffff" stroke-opacity=".12"/>
      <text x="400" y="34" fill="${theme.accentB}" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="900">BUYER LANE</text>
      <text x="400" y="62" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="850">${escapeSvg(category)}</text>
    </g>
    <g transform="translate(0 744)">
      <rect width="720" height="2" fill="url(#accent)" opacity=".84"/>
      <text x="0" y="48" fill="#b9c7d8" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="760">${escapeSvg(url)}</text>
    </g>
  </g>
  <rect x="42" y="42" width="1516" height="816" rx="48" fill="none" stroke="#ffffff" stroke-opacity=".08"/>
</svg>`;
}

function getDemoVideoFrameMarkup(youtubeVideoId: string, theme: ReturnType<typeof themeForProduct>) {
  const thumbnailUrl = `https://i.ytimg.com/vi/${encodeURIComponent(youtubeVideoId)}/hqdefault.jpg`;
  return `<g>
      <clipPath id="demoFrameClip">
        <rect x="58" y="66" width="432" height="248" rx="28"/>
      </clipPath>
      <rect x="58" y="66" width="432" height="248" rx="28" fill="#03060c"/>
      <image x="58" y="66" width="432" height="248" href="${thumbnailUrl}" preserveAspectRatio="xMidYMid slice" clip-path="url(#demoFrameClip)"/>
      <rect x="58" y="66" width="432" height="248" rx="28" fill="#02040a" opacity=".18"/>
      <circle cx="274" cy="190" r="48" fill="#050914" opacity=".72" stroke="${theme.accentA}" stroke-opacity=".72" stroke-width="3"/>
      <path d="M260 164 260 216 306 190Z" fill="#ffffff"/>
      <rect x="82" y="88" width="154" height="34" rx="17" fill="#050914" opacity=".78" stroke="${theme.accentB}" stroke-opacity=".48"/>
      <text x="101" y="111" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="900" letter-spacing="2">DEMO VIDEO</text>
      <rect x="78" y="268" width="388" height="20" rx="10" fill="#050914" opacity=".74"/>
      <rect x="78" y="268" width="236" height="20" rx="10" fill="${theme.accentA}" opacity=".86"/>
    </g>`;
}

function getFallbackDeviceFrameMarkup(theme: ReturnType<typeof themeForProduct>) {
  return `<g>
      <rect x="58" y="66" width="432" height="248" rx="28" fill="#03060c"/>
      <path d="M86 286 186 122 282 250 346 166 464 286Z" fill="url(#accent)" opacity=".92"/>
      <circle cx="406" cy="124" r="34" fill="${theme.accentB}" opacity=".84"/>
    </g>`;
}

function getMusicPopProductSvg(product: ProductRecord) {
  const name = customerProductName(product);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc">
  <title id="title">${escapeSvg(name)} pop-up music product image</title>
  <desc id="desc">A bold ILLCO AI Music visual with a pop-up microphone, boombox, speakers, and beat energy.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#170014"/>
      <stop offset=".42" stop-color="#32104f"/>
      <stop offset="1" stop-color="#061426"/>
    </linearGradient>
    <linearGradient id="pink" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff4fcb"/>
      <stop offset="1" stop-color="#ffef5a"/>
    </linearGradient>
    <linearGradient id="cyan" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4df3ff"/>
      <stop offset="1" stop-color="#7cff7c"/>
    </linearGradient>
    <filter id="popShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="28" stdDeviation="22" flood-color="#000000" flood-opacity=".48"/>
      <feDropShadow dx="0" dy="0" stdDeviation="16" flood-color="#ff4fcb" flood-opacity=".42"/>
    </filter>
    <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="18" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 .6 0 1 0 0 .1 0 0 1 0 .9 0 0 0 .7 0"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <path d="M-80 718 C 190 552, 338 822, 590 655 S 963 394, 1248 516 1518 685, 1690 502" fill="none" stroke="#ff4fcb" stroke-width="8" stroke-linecap="round" opacity=".55"/>
  <path d="M-60 230 C 210 98, 392 306, 600 174 S 922 74, 1128 205 1398 350, 1664 188" fill="none" stroke="#4df3ff" stroke-width="6" stroke-linecap="round" opacity=".5"/>
  <g opacity=".28">
    <circle cx="142" cy="164" r="72" fill="#ff4fcb"/>
    <circle cx="1430" cy="170" r="104" fill="#4df3ff"/>
    <circle cx="1310" cy="760" r="126" fill="#ffef5a"/>
  </g>
  <g transform="translate(88 72)">
    <text x="0" y="48" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="950">illco <tspan fill="#ff4fcb">AI</tspan> <tspan fill="#4df3ff">Music</tspan></text>
    <text x="0" y="96" fill="#c8f8ff" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="850" letter-spacing="3">POP-UP BEAT VAULT VISUAL</text>
  </g>
  <g transform="translate(96 210)">
    <rect width="564" height="86" rx="43" fill="#120b24" stroke="#ffffff" stroke-opacity=".2"/>
    <text x="34" y="56" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="900">Exclusive beat checkout</text>
    <text x="0" y="184" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="88" font-weight="950">${escapeSvg(name)}</text>
    <text x="4" y="248" fill="#dffbff" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="760">License handoff, clean ownership, fast post-purchase next step.</text>
  </g>
  <g transform="translate(918 132)" filter="url(#popShadow)">
    <g transform="rotate(-8 220 330)">
      <rect x="72" y="188" width="490" height="318" rx="44" fill="#101929" stroke="#ffffff" stroke-opacity=".2" stroke-width="3"/>
      <rect x="111" y="232" width="410" height="88" rx="28" fill="url(#pink)"/>
      <circle cx="186" cy="410" r="75" fill="#050914" stroke="url(#cyan)" stroke-width="18"/>
      <circle cx="446" cy="410" r="75" fill="#050914" stroke="url(#cyan)" stroke-width="18"/>
      <circle cx="186" cy="410" r="24" fill="#ff4fcb"/>
      <circle cx="446" cy="410" r="24" fill="#ff4fcb"/>
      <rect x="272" y="372" width="88" height="76" rx="18" fill="#f8f9ff" opacity=".95"/>
      <rect x="288" y="388" width="56" height="12" rx="6" fill="#101929"/>
      <rect x="288" y="416" width="56" height="12" rx="6" fill="#101929"/>
      <path d="M168 188 C 226 80, 404 80, 462 188" fill="none" stroke="#f8f9ff" stroke-width="28" stroke-linecap="round"/>
    </g>
    <g transform="translate(-114 26) rotate(10 150 330)">
      <rect x="98" y="100" width="130" height="354" rx="65" fill="url(#cyan)" stroke="#ffffff" stroke-opacity=".4" stroke-width="5"/>
      <rect x="123" y="128" width="80" height="184" rx="40" fill="#07111f"/>
      <path d="M80 278 C 114 316, 210 316, 246 278" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
      <rect x="148" y="452" width="30" height="154" rx="15" fill="#f8f9ff"/>
      <rect x="84" y="590" width="158" height="34" rx="17" fill="#f8f9ff"/>
    </g>
  </g>
  <g transform="translate(116 678)">
    <rect width="412" height="82" rx="24" fill="url(#pink)" filter="url(#softGlow)"/>
    <text x="38" y="52" fill="#13071d" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="950">BUY THE VAULT BEAT</text>
    <rect x="448" width="360" height="82" rx="24" fill="#07111f" stroke="#4df3ff" stroke-opacity=".55"/>
    <text x="486" y="52" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="900">OWNERSHIP READY</text>
  </g>
  <g transform="translate(1088 690)" opacity=".95">
    <path d="M0 70 48 0l48 70 48-70 48 70 48-70 48 70" fill="none" stroke="#ffef5a" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="0" y="126" fill="#dffbff" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="850">mic / boombox / beat energy</text>
  </g>
</svg>`;
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




