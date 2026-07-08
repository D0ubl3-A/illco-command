const allowedReturnHosts = new Set([
  "localhost",
  "127.0.0.1",
  "illcoai.tech",
  "www.illcoai.tech",
  "illco-ai-app-store.vercel.app",
  "youtubeopsvercel.vercel.app",
]);

export function safeAccountReturnTo(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    const allowed =
      allowedReturnHosts.has(hostname) ||
      hostname.endsWith(".illcoai.tech");

    return allowed && (url.protocol === "https:" || url.protocol === "http:") ? url.toString() : "";
  } catch {
    return "";
  }
}
