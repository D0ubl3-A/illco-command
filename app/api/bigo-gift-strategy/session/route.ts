import { NextResponse } from "next/server";

import { getUserFromBigoExtensionToken } from "@/lib/bigo-gift-strategy";
import { getCurrentUser } from "@/lib/user-accounts";

function json(data: Record<string, unknown>, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("access-control-allow-origin", "*");
  response.headers.set("access-control-allow-methods", "GET,OPTIONS");
  response.headers.set("access-control-allow-headers", "content-type");
  return response;
}

export async function OPTIONS() {
  return json({ ok: true });
}

export async function GET(request: Request) {
  const bearerUser = await getUserFromBigoExtensionToken(request.headers.get("authorization"));
  const user = bearerUser || await getCurrentUser();

  return json({
    ok: true,
    authenticated: Boolean(user),
    accountUrl: "/account?returnTo=/tools/bigo-gift-strategy",
    toolUrl: "/tools/bigo-gift-strategy",
    poweredBy: "OpenAI Agent SDK",
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      : null,
  });
}
