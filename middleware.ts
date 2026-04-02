import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/callback/credentials", "/api/setup/initialize"],
};
