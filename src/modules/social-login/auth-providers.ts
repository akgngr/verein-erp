import "server-only";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Twitter from "next-auth/providers/twitter";
import Facebook from "next-auth/providers/facebook";
import { getDb } from "@/shared/db";
import { openSecret } from "@/shared/security/secret-box";
import { defineAuthProviders } from "@/shared/auth/providers";
import { PROVIDERS, type ProviderId } from "./constants";

async function load(id: ProviderId) {
  const row = await getDb().socialLoginProvider.findUnique({ where: { id } });
  if (!row?.enabled || !row.clientId) return null;
  const clientSecret = openSecret(`social-login:${id}`, row.secretEnc);
  if (!clientSecret) return null;
  const options = { clientId: row.clientId, clientSecret, allowDangerousEmailAccountLinking: false };
  switch (id) {
    case "google": return Google({ ...options, authorization: { params: { scope: "openid profile email" } } });
    case "microsoft-entra-id":
      if (!row.tenantId || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(row.tenantId)) return null;
      return MicrosoftEntraID({ ...options, issuer: `https://login.microsoftonline.com/${row.tenantId}/v2.0`, authorization: { params: { scope: "openid profile email" } } });
    case "twitter": return Twitter({ ...options, authorization: { params: { scope: "users.read tweet.read" } } });
    case "facebook": return Facebook(options);
  }
}
const labels: Record<ProviderId, string> = { google: "Google", "microsoft-entra-id": "Microsoft Entra ID", twitter: "X", facebook: "Facebook" };
export const authProviders = defineAuthProviders({
  moduleKey: "social-login",
  providers: PROVIDERS.map((id) => ({ id, label: labels[id], load: () => load(id) })),
});
