import "@/lib/server-only";

import { isTrustedAdminEmail } from "@/lib/admin-identities";
import {
  getOAuthUserContextFromRequest,
  type OAuthUserContext,
} from "@/lib/chatgpt-oauth";
import { getCurrentUser, type UserAccount } from "@/lib/user-accounts";

export const AUTOTUBE_OAUTH_RESOURCE = "https://illcoai.tech/api/chatgpt/autotube/mcp";
export const AUTOTUBE_OAUTH_METADATA =
  "https://illcoai.tech/.well-known/oauth-protected-resource/autotube";
export const AUTOTUBE_REQUIRED_SCOPE = "profile";

function normalizeEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function configuredAutoTubeEmails() {
  return new Set(
    String(process.env.AUTOTUBE_ALLOWED_EMAILS || "")
      .split(/[\s,;|]+/)
      .map(normalizeEmail)
      .filter(Boolean),
  );
}

export function isAutoTubeEmailAllowed(value: string | null | undefined) {
  const email = normalizeEmail(value);
  return Boolean(
    email &&
      (isTrustedAdminEmail(email) || configuredAutoTubeEmails().has(email)),
  );
}

export type AutoTubeAccessResult =
  | { ok: true; user: UserAccount; source: "session" }
  | {
      ok: true;
      user: UserAccount;
      context: OAuthUserContext;
      source: "oauth";
    }
  | {
      ok: false;
      status: 401 | 403;
      code: "autotube_sign_in_required" | "autotube_access_denied";
      message: string;
    };

export async function authorizeAutoTubeSession(): Promise<AutoTubeAccessResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      status: 401,
      code: "autotube_sign_in_required",
      message: "Sign in to an authorized iLLCo AI account before starting paid AutoTube work.",
    };
  }
  if (!isAutoTubeEmailAllowed(user.email)) {
    return {
      ok: false,
      status: 403,
      code: "autotube_access_denied",
      message:
        "This iLLCo AI account does not have AutoTube production access. Add the account email to AUTOTUBE_ALLOWED_EMAILS or use a trusted administrator account.",
    };
  }
  return { ok: true, user, source: "session" };
}

export async function authorizeAutoTubeOAuth(
  request: Request,
): Promise<AutoTubeAccessResult> {
  const context = await getOAuthUserContextFromRequest(request);
  if (!context || !context.scopes.includes(AUTOTUBE_REQUIRED_SCOPE)) {
    return {
      ok: false,
      status: 401,
      code: "autotube_sign_in_required",
      message: "Connect an authorized iLLCo AI account before running AutoTube.",
    };
  }
  if (!isAutoTubeEmailAllowed(context.user.email)) {
    return {
      ok: false,
      status: 403,
      code: "autotube_access_denied",
      message:
        "The connected iLLCo AI account is not authorized for AutoTube production renders.",
    };
  }
  return { ok: true, user: context.user, context, source: "oauth" };
}

export function autoTubeAccessResponse(
  result: Extract<AutoTubeAccessResult, { ok: false }>,
) {
  return Response.json(
    { ok: false, error: result.code, message: result.message },
    {
      status: result.status,
      headers: {
        "Cache-Control": "no-store",
        ...(result.status === 401
          ? {
              "WWW-Authenticate": `Bearer resource_metadata="${AUTOTUBE_OAUTH_METADATA}", scope="${AUTOTUBE_REQUIRED_SCOPE}"`,
            }
          : {}),
      },
    },
  );
}

export function autoTubeMcpAccessResult(
  id: unknown,
  result: Extract<AutoTubeAccessResult, { ok: false }>,
) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result: {
      isError: true,
      content: [{ type: "text", text: result.message }],
      _meta: {
        access: { error: result.code, status: result.status },
        ...(result.status === 401
          ? {
              "mcp/www_authenticate": `Bearer resource_metadata="${AUTOTUBE_OAUTH_METADATA}", scope="${AUTOTUBE_REQUIRED_SCOPE}"`,
            }
          : {}),
      },
    },
  };
}
