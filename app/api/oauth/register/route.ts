import { CHATGPT_OAUTH_CLIENT_ID, getOAuthAuthorizeUrl, getOAuthTokenUrl } from "@/lib/chatgpt-oauth";

export const dynamic = "force-dynamic";

function originFrom(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const origin = originFrom(request);
  return Response.json({
    client_id: String(body.client_id || CHATGPT_OAUTH_CLIENT_ID),
    client_id_issued_at: Math.floor(Date.now() / 1000),
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"],
    redirect_uris: Array.isArray(body.redirect_uris) ? body.redirect_uris : [],
    authorization_endpoint: getOAuthAuthorizeUrl(origin),
    token_endpoint: getOAuthTokenUrl(origin),
  });
}
