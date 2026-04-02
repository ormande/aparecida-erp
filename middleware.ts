import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { getRateLimitIdentifier, loginRatelimit, setupRatelimit } from "@/lib/ratelimit";

const rateLimitedJson = JSON.stringify({
  message: "Muitas tentativas. Tente novamente em instantes.",
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/auth/callback/credentials" && request.method === "POST") {
    const { success } = await loginRatelimit.limit(getRateLimitIdentifier(request));
    if (!success) {
      return new NextResponse(rateLimitedJson, {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/setup/initialize") {
    const { success } = await setupRatelimit.limit(getRateLimitIdentifier(request));
    if (!success) {
      return new NextResponse(rateLimitedJson, {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return NextResponse.next();
  }

  if (pathname === "/selecionar-unidade" || pathname.startsWith("/selecionar-unidade/")) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret });

  if (!token?.id) {
    return NextResponse.next();
  }

  const activeUnitId = token.activeUnitId;
  const needsUnitSelection =
    activeUnitId === undefined || activeUnitId === null || activeUnitId === "";

  if (!needsUnitSelection) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/selecionar-unidade";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/api/auth/callback/credentials",
    "/api/setup/initialize",
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
