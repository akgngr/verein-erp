import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "./auth.config";
import { authorize } from "./services/authorize";

/**
 * Tam Auth.js yapılandırması (Prisma kullanır; YALNIZCA sunucuda import edilir).
 * Edge/middleware tarafı için bkz. edge.ts → auth.config.ts.
 */
export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        // i18n-ignore — Auth.js varsayılan formu kullanılmaz; etiketler görünmez.
        email: { label: "email" },
        password: { label: "password", type: "password" },
      },
      authorize,
    }),
  ],
});
