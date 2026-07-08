import {
  CHATGPT_OAUTH_CLIENT_ID,
  exchangeOAuthAuthorizationCode,
  isAllowedClientId,
  isAllowedRedirectUri,
} from "@/lib/chatgpt-oauth";

export const dynamic = "force-dynamic";

function jsonError(error: string, description: string, status = 400) {
  return Response.json({ error, error_description: description }, { status });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const grantType = String(form.get("grant_type") || "");
  const code = String(form.get("code") || "");
  const clientId = String(form.get("client_id") || CHATGPT_OAUTH_CLIENT_ID);
  const redirectUri = String(form.get("redirect_uri") || "");
  const codeVerifier = String(form.get("code_verifier") || "");

  if (grantType !== "authorization_code") {
    return jsonError("unsupported_grant_type", "Only authorization_code is supported.");
  }
  if (!isAllowedClientId(clientId)) {
    return jsonError("unauthorized_client", "Unknown OAuth client.", 401);
  }
  if (!isAllowedRedirectUri(redirectUri)) {
    return jsonError("invalid_request", "Invalid redirect_uri.");
  }
  if (!code || !codeVerifier) {
    return jsonError("invalid_request", "code and code_verifier are required.");
  }

  try {
    const token = await exchangeOAuthAuthorizationCode({ code, clientId, redirectUri, codeVerifier });
    return Response.json({
      access_token: token.accessToken,
      token_type: token.tokenType,
      expires_in: token.expiresIn,
      scope: token.scope,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed.";
    return jsonError("invalid_grant", message, 400);
  }
}
