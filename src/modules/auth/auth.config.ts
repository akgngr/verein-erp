import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

import { SESSION_MAX_AGE_SECONDS } from "./services/session";

/**
 * Edge-uyumlu (Prisma içermeyen) temel Auth.js yapılandırması.
 *
 * - Middleware (src/proxy.ts) yalnızca bu yapılandırmayı kullanır; Prisma import edilmez.
 * - Tam yapılandırma (Credentials + authorize) auth.ts içindedir; auth.ts bu dosyayı
 *   kendi içine yayarak aynı jwt/session callback'lerini paylaşır.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/giris" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        // KARAR: Credentials authorize çıktısı JWT'ye taşınırken burada tip anlık
        // görüntüsü (snapshot) kullanılır; @auth/core'un User tip genişletmesi
        // sürümler arasında farklı çözümlenebildiği için alanlar Partial ile okunur.
        const authorizedUser = user as Partial<{
          id: string;
          name: string | null;
          email: string | null;
          role: "ADMIN" | "BOARD" | "SECRETARY" | "VIEWER" | "TREASURER" | "AUDITOR";
          mustChangePassword: boolean;
        }>;
        token.id = authorizedUser.id;
        token.name = authorizedUser.name;
        token.email = authorizedUser.email;
        token.role = authorizedUser.role;
        token.mustChangePassword = authorizedUser.mustChangePassword;
      }
      // Parola değişikliği sonrası token'ın tazelenmesi (unstable_update ile tetiklenir).
      if (trigger === "update" && session?.user) {
        const updatedUser = session.user as Partial<{
          name: string | null;
          email: string | null;
          mustChangePassword: boolean;
        }>;
        if (updatedUser.name) token.name = updatedUser.name;
        if (updatedUser.email) token.email = updatedUser.email;
        if (typeof updatedUser.mustChangePassword === "boolean") {
          token.mustChangePassword = updatedUser.mustChangePassword;
        }
      }
      return token;
    },
    session({ session, token }) {
      // KARAR: "next-auth/jwt" modülü JWT tipini `export *` ile yeniden dışa aktardığı
      // için tip genişletmesi (src/types/next-auth.d.ts) callback imzasına birleşmiyor;
      // JWT claim alanları burada tek noktadan anlık görüntüyle okunur.
      const claims = token as Partial<{
        id: string;
        role: "ADMIN" | "BOARD" | "SECRETARY" | "VIEWER" | "TREASURER" | "AUDITOR";
        mustChangePassword: boolean;
      }>;
      session.user.id = claims.id ?? "";
      if (claims.role) session.user.role = claims.role;
      session.user.mustChangePassword = claims.mustChangePassword ?? true;
      return session;
    },
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const path = nextUrl.pathname;
      const sessionUser = auth?.user;

      // Pasifle alınan kullanıcı panelde tutulamaz; layout onu
      // /giris?pasif=1 adresine yönlendirir ve döngü burada kırılır.
      const isPassiveNotice = path === "/giris" && nextUrl.searchParams.has("pasif");

      if (path === "/giris" && !isPassiveNotice) {
        return sessionUser ? NextResponse.redirect(new URL("/", nextUrl)) : true;
      }

      if (!sessionUser) {
        return NextResponse.redirect(new URL("/giris", nextUrl));
      }

      // Parolasını değiştirmesi gereken kullanıcı yalnızca /profil'e gidebilir.
      if (sessionUser.mustChangePassword && path !== "/profil") {
        return NextResponse.redirect(new URL("/profil", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
