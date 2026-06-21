import { buildWidgetHtml } from "@/lib/chatgpt-apps/lyric-video-forge";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  return new Response(buildWidgetHtml(origin), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
