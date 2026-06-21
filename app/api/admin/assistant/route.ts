import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/app/admin/auth";
import { answerAdminAssistant } from "@/lib/admin-watcher";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ detail: "Admin authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { message?: string };
  const message = String(body.message || "").trim();

  if (!message) {
    return NextResponse.json({ detail: "Message is required." }, { status: 400 });
  }

  return NextResponse.json(answerAdminAssistant(message));
}
