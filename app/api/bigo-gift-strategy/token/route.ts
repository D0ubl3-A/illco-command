import { NextResponse } from "next/server";

import { createBigoExtensionToken } from "@/lib/bigo-gift-strategy";
import { hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-accounts";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign into ILLCO before creating an extension token." }, { status: 401 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({ ok: false, error: "Extension token storage is not configured yet." }, { status: 503 });
  }

  const token = await createBigoExtensionToken(user);
  return NextResponse.json({
    ok: true,
    ...token,
  });
}
