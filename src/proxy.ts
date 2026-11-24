import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";

import { authConfig } from "@/modules/auth/edge";
import { buildPortalCsp, generatePortalNonce } from "@/modules/member-portal/services/portal-csp";

// Next.js 16: middleware dosyasının adı proxy.ts'tir (kurulu sürüme göre belirlendi).
// Edge-uyumlu Auth.js yapılandırması kullanılır; Prisma import EDİLMEZ.
const authMiddleware = NextAuth(authConfig).auth;

function isPortalPath(pathname: string): boolean {
  return (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname.startsWith("/api/member-portal/")
  );
}

function withPortalSecurityHeaders(res: NextResponse, nonce: string): NextResponse {
  res.headers.set("Content-Security-Policy", buildPortalCsp(nonce));
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  return res;
}

export async function proxy(request: NextRequest, event: unknown) {
  const { pathname } = request.nextUrl;

  // Isolated Member Portal branch (ADR 0010):
  // - Never invokes admin Auth.js middleware (admin session cookie is ignored/refused).
  // - PORTAL_ENABLED=false by default -> 404.
  if (isPortalPath(pathname)) {
    const nonce = generatePortalNonce();
    if (process.env.PORTAL_ENABLED !== "true") {
      return withPortalSecurityHeaders(new NextResponse("Not found", { status: 404 }), nonce);
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    return withPortalSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce,
    );
  }

  // Admin routes never accept the portal cookie as authentication.
  return (authMiddleware as unknown as (req: NextRequest, ctx: unknown) => Promise<Response>)(request, event);
}

export default proxy;

export const config = {
  matcher: [
    "/((?!api/health|api/auth|api/documents|api/calendar/feed|api/campaign-telegram/webhook|api/notifications/telegram-webhook|api/campaign-sms/webhook|api/campaign-whatsapp/webhook|api/mailings/t/|formular/|oy$|oy/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
