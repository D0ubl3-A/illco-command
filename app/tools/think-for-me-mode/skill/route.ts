import { NextResponse } from "next/server";

import { getProductAccess } from "@/lib/product-access";
import { thinkForMeSkillMarkdown } from "@/lib/think-for-me-skill";

const productId = "think-for-me-mode";

export async function GET(request: Request) {
  const access = await getProductAccess(productId);
  if (!access.allowed) {
    return NextResponse.redirect(new URL("/tools/think-for-me-mode?locked=1", request.url));
  }

  return new Response(thinkForMeSkillMarkdown, {
    headers: {
      "Content-Disposition": 'attachment; filename="SKILL.md"',
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
