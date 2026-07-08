import { CHATGPT_OAUTH_RESOURCE, getOAuthIssuer } from "@/lib/chatgpt-oauth";

export const dynamic = "force-dynamic";

function originFrom(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  const origin = originFrom(request);
  return Response.json({
    resource: CHATGPT_OAUTH_RESOURCE,
    authorization_servers: [getOAuthIssuer(origin)],
    bearer_methods_supported: ["header"],
    scopes_supported: [
      "lyric_video:plan",
      "lyric_video:transcribe",
      "lyric_video:caption",
      "lyric_video:render",
    ],
  });
}
