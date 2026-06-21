import { handleLyricVideoForgeRpc } from "@/lib/chatgpt-apps/lyric-video-forge";

export const dynamic = "force-dynamic";

function originFrom(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return handleLyricVideoForgeRpc(body, originFrom(request));
}
