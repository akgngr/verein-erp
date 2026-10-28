import NextAuth from "next-auth";

import { authConfig } from "@/modules/auth/edge";

// Next.js 16: middleware dosyasının adı proxy.ts'tir (kurulu sürüme göre belirlendi).
// Edge-uyumlu Auth.js yapılandırması kullanılır; Prisma import EDİLMEZ.
const authMiddleware = NextAuth(authConfig).auth;

export default authMiddleware;
export const proxy = authMiddleware;

export const config = {
  // /api/health, /api/auth ve statik dosyalar muaf tutulur (6. bölüm, md. 5).
  // KARAR (Faz 1): /api/documents uçları da muaftır — oturumsuz isteğin
  // middleware'in yönlendirmesine değil, handler'ın 401/403 JSON yanıtına
  // düşmesi gerekir (7. bölüm: "Handler'lar yönlendirme yapmaz").
  matcher: [
    "/((?!api/health|api/auth|api/documents|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
