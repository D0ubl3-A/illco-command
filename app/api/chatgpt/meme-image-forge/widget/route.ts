export const dynamic = "force-dynamic";

export async function GET() {
  return new Response("<!doctype html><html><body><h1>Meme Image Forge</h1><p>Open inside ChatGPT to render generated meme images.</p></body></html>", {
    headers: { "Content-Type": "text/html;profile=mcp-app", "Cache-Control": "no-store" },
  });
}