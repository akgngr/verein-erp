import NextAuth from "next-auth";

import { authConfig } from "@/modules/auth/edge";

// Next.js 16: middleware dosyasının adı proxy.ts'tir (kurulu sürüme göre belirlendi).
// Edge-uyumlu Auth.js yapılandırması kullanılır; Prisma import EDİLMEZ.
export default NextAuth(authConfig).auth;

export const config = {
  // /api/health, /api/auth ve statik dosyalar muaf tutulur (6. bölüm, md. 5).
  matcher: [
    "/((?!api/health|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
