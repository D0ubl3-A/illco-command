import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (host?.toLowerCase().split(":")[0] === "www.illcoai.tech") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = "illcoai.tech";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icon.svg).*)"],
};
