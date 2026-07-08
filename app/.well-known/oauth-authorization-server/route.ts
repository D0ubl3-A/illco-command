import {
  CHATGPT_OAUTH_SCOPES,
  getOAuthAuthorizeUrl,
  getOAuthIssuer,
  getOAuthRegistrationUrl,
  getOAuthTokenUrl,
  getOAuthUserinfoUrl,
} from "@/lib/chatgpt-oauth";

export const dynamic = "force-dynamic";

function originFrom(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  const origin = originFrom(request);
  return Response.json({
    issuer: getOAuthIssuer(origin),
    authorization_endpoint: getOAuthAuthorizeUrl(origin),
    token_endpoint: getOAuthTokenUrl(origin),
    registration_endpoint: getOAuthRegistrationUrl(origin),
    userinfo_endpoint: getOAuthUserinfoUrl(origin),
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: CHATGPT_OAUTH_SCOPES,
  });
}
