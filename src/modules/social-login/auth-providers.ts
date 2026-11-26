import "server-only";

import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Twitter from "next-auth/providers/twitter";
import Facebook from "next-auth/providers/facebook";
import { getDb } from "@/shared/db";
import { openSecret } from "@/shared/security/secret-box";
import type { ExternalAuthProvider, ModuleAuthProviders } from "@/shared/auth/providers";
import { subjectHash } from "./helpers/identity";

export const authProviders: ModuleAuthProviders = {
  module: "social-login",
  async load() {
    const rows = await getDb().socialLoginProvider.findMany({ where: { enabled: true } });
    const providers: ExternalAuthProvider[] = [];
    for (const row of rows) {
      try {
        const clientSecret = openSecret(`social-login:${row.id}`, row.secretEnc);
        if (!clientSecret || !row.clientId) continue;
        const options = { clientId: row.clientId, clientSecret, allowDangerousEmailAccountLinking: false };
        switch (row.id) {
          case "google": providers.push(Google({ ...options, authorization: { params: { scope: "openid profile email" } } })); break;
          case "microsoft-entra-id":
            if (row.tenantId && /^[0-9a-f-]{36}$/i.test(row.tenantId)) {
              providers.push(MicrosoftEntraID({ ...options, issuer: `https://login.microsoftonline.com/${row.tenantId}/v2.0`, authorization: { params: { scope: "openid profile email" } } }));
            }
            break;
          case "twitter": providers.push(Twitter({ ...options, authorization: { params: { scope: "users.read tweet.read" } } })); break;
          case "facebook": providers.push(Facebook(options)); break;
        }
      } catch {
        // Invalid configuration disables only this provider.
      }
    }
    return providers;
  },
  async resolveUserId(provider, subject) {
    if (!subject) return null;
    const db = getDb();
    const settings = await db.socialLoginProvider.findUnique({ where: { id: provider } });
    if (!settings?.enabled) return null;
    const link = await db.socialLoginIdentity.findUnique({ where: { provider_subjectHash: { provider, subjectHash: subjectHash(provider, subject) } } });
    return link?.userId ?? null;
  },
};
