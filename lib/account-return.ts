const allowedReturnHosts = new Set(["localhost", "127.0.0.1", "illco-command.vercel.app", "illcoai.tech"]);

export function safeAccountReturnTo(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    const allowed = allowedReturnHosts.has(hostname) || hostname.endsWith(".vercel.app");

    return allowed && (url.protocol === "https:" || url.protocol === "http:") ? url.toString() : "";
  } catch {
    return "";
  }
}
