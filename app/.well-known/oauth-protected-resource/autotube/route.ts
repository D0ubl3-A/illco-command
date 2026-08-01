import {
  AUTOTUBE_OAUTH_RESOURCE,
  AUTOTUBE_REQUIRED_SCOPE,
} from "@/lib/autotube/access";
import { getOAuthIssuer } from "@/lib/chatgpt-oauth";

export const dynamic = "force-dynamic";

function originFrom(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  const origin = originFrom(request);
  return Response.json(
    {
      resource: AUTOTUBE_OAUTH_RESOURCE,
      authorization_servers: [getOAuthIssuer(origin)],
      bearer_methods_supported: ["header"],
      scopes_supported: ["openid", "email", "profile", AUTOTUBE_REQUIRED_SCOPE],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
