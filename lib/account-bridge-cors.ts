export function accountBridgeCorsHeaders(origin: string | null) {
  const value = origin || "";
  let allowed = false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    allowed =
      ["localhost", "127.0.0.1", "gemini-video-studio.vercel.app", "youtubeopsvercel.vercel.app"].includes(hostname) ||
      /^gemini-video-studio-[a-z0-9-]+-illcoai\.vercel\.app$/.test(hostname) ||
      /^youtubeopsvercel-[a-z0-9-]+-illcoai\.vercel\.app$/.test(hostname);
  } catch {
    allowed = false;
  }

  return {
    "Access-Control-Allow-Origin": allowed ? value : "https://illcoai.tech",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}