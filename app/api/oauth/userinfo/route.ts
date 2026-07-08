import { getOAuthUserContextFromRequest, isOAuthUserAdmin } from "@/lib/chatgpt-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getOAuthUserContextFromRequest(request);
  if (!context) {
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }
  return Response.json({
    sub: context.user.id,
    email: context.user.email,
    email_verified: Boolean(context.user.emailVerifiedAt || context.user.googleLinked),
    name: context.user.name,
    picture: context.user.avatarUrl || undefined,
    role: isOAuthUserAdmin(context) ? "admin" : "user",
  });
}
