import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/app/admin/auth";
import { addAdminRepairRequest } from "@/lib/admin-repair-queue";
import { getAdminWatcherSnapshot } from "@/lib/admin-watcher";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ detail: "Admin authentication required." }, { status: 401 });
  }

  return NextResponse.json(getAdminWatcherSnapshot());
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ detail: "Admin authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    sectionId?: string;
    sectionLabel?: string;
    reason?: string;
  };
  const sectionId = String(body.sectionId || "").trim();
  const sectionLabel = String(body.sectionLabel || "").trim();
  const reason = String(body.reason || "").trim();

  if (!sectionId || !sectionLabel || !reason) {
    return NextResponse.json({ detail: "sectionId, sectionLabel, and reason are required." }, { status: 400 });
  }

  const repairRequest = addAdminRepairRequest({ sectionId, sectionLabel, reason });
  return NextResponse.json({ ok: true, repairRequest, snapshot: getAdminWatcherSnapshot() });
}
