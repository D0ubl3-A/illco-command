export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function svgFor(payload: any) {
  const top = String(payload.top_text || "MEME").replace(/[&<>"]/g, "");
  const bottom = String(payload.bottom_text || "POST IT").replace(/[&<>"]/g, "");
  const format = String(payload.meme_format || "Meme").replace(/[&<>"]/g, "");
  const platform = String(payload.platform || "social").replace(/[&<>"]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#ffc440"/><rect x="110" y="230" width="980" height="680" rx="54" fill="#fff" stroke="#161814" stroke-width="18"/><rect x="160" y="285" width="880" height="560" rx="34" fill="#ffc440" stroke="#161814" stroke-width="10"/><circle cx="600" cy="530" r="170" fill="#fff8df" stroke="#161814" stroke-width="14"/><circle cx="540" cy="490" r="25" fill="#161814"/><circle cx="660" cy="490" r="25" fill="#161814"/><path d="M505 602 C565 660 690 660 740 590" fill="none" stroke="#161814" stroke-width="24" stroke-linecap="round"/><text x="600" y="125" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-size="74" font-weight="900" fill="#fff" stroke="#111" stroke-width="14" paint-order="stroke fill">${top.slice(0, 34)}</text><text x="600" y="1015" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-size="66" font-weight="900" fill="#fff" stroke="#111" stroke-width="14" paint-order="stroke fill">${bottom.slice(0, 38)}</text><rect x="160" y="1070" width="880" height="58" rx="29" fill="#161814"/><text x="600" y="1109" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="900" fill="#fff">${format} / ${platform} / Meme Image Forge</text></svg>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const encoded = url.searchParams.get("m") || "";
  let payload: any = {};
  try { payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); } catch {}
  return new Response(svgFor(payload), { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable", "Access-Control-Allow-Origin": "*" } });
}