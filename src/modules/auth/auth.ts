import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "./auth.config";
import { authorize } from "./services/authorize";
import { resolveOAuthSignIn, type OAuthSessionUser } from "./services/oauth-identity";
import { loadEnabledAuthProviders } from "./services/oauth-providers";
import { safeRedirect } from "./services/safe-redirect";

/** signIn → jwt arasında iç kullanıcıyı işaretlemek için (sağlayıcı profili oturuma taşınmaz). */
const OAUTH_RESOLVED = Symbol.for("verein.auth.oauthResolved");
type ResolvedMarker = { [OAUTH_RESOLVED]?: OAuthSessionUser };

const credentials = Credentials({
  credentials: {
    // i18n-ignore — Auth.js varsayılan formu kullanılmaz; etiketler görünmez.
    email: { label: "email" },
    password: { label: "password", type: "password" },
    // #603: second factor (TOTP or recovery code) and the server-internal re-issue ticket.
    otp: { label: "otp" },
    reissue: { label: "reissue" },
  },
  authorize,
});

/**
 * Tam Auth.js yapılandırması (Prisma kullanır; YALNIZCA sunucuda import edilir).
 * Edge/middleware tarafı için bkz. edge.ts → auth.config.ts (bu dosya oraya hiç girmez).
 *
 * #612: Yapılandırma istek anında kurulur (lazy): Credentials her zaman ilk ve değişmeden; ardından modüllerin
 * bildirdiği ve etkin olan dış sağlayıcılar. Sağlayıcı kaydı hata verirse yalnız parola girişi kalır.
 */
export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(async (): Promise<NextAuthConfig> => {
  const external = await loadEnabledAuthProviders();
  const externalIds = new Set(external.ids);

  return {
    ...authConfig,
    providers: [credentials, ...external.providers],
    callbacks: {
      ...authConfig.callbacks,
      async signIn({ user, account }) {
        if (!account || account.provider === "credentials") return true;
        // Yalnız bu istekte yüklenmiş sağlayıcı; e-posta ile eşleme yok, kullanıcı oluşturma yok.
        if (!externalIds.has(account.provider) || !account.providerAccountId) return "/giris?oauth=denied";
        const result = await resolveOAuthSignIn(account.provider, String(account.providerAccountId));
        if (!result.ok) return "/giris?oauth=denied";
        (user as ResolvedMarker)[OAUTH_RESOLVED] = result.user;
        return true;
      },
      async jwt(params) {
        const { account, user, token } = params;
        if (account && account.provider !== "credentials") {
          const resolved = (user as ResolvedMarker | undefined)?.[OAUTH_RESOLVED];
          // signIn kabul etmeden jwt'ye gelinemez; gelinirse oturum hiç kurulmaz (fail closed).
          if (!resolved) return null;
          // Sağlayıcı profil alanları (ad, e-posta, resim, sağlayıcı kimliği) atılır; oturum iç kullanıcıdan kurulur.
          delete token.picture;
          token.sub = resolved.id;
          return authConfig.callbacks.jwt({ ...params, token, user: resolved as never });
        }
        return authConfig.callbacks.jwt(params);
      },
      redirect({ url, baseUrl }) {
        return safeRedirect(url, baseUrl);
      },
    },
  };
});
