import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { moduleAuthProviderRegistry } from "@/auth-provider-registry";
import { collectAuthProviders } from "@/shared/auth/providers";
import { authConfig } from "./auth.config";
import { authorize } from "./services/authorize";
import { resolveExternalIdentity } from "./services/external-auth";

/** Server-only lazy configuration; the Edge configuration remains independent. */
async function loadExternalProviders() {
  return collectAuthProviders(moduleAuthProviderRegistry, async (key) => {
    const { getModuleAvailability } = await import("@/modules/system/server");
    return (await getModuleAvailability(key)) === "available";
  });
}

export async function listExternalLoginProviders() {
  return (await loadExternalProviders()).map(({ provider }) => ({ id: provider.id, name: provider.name }));
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(async () => {
  const external = await loadExternalProviders();
  async function resolve(provider: string, subject: string) {
    const entry = external.find((item) => item.provider.id === provider);
    if (!entry || !subject) return null;
    try {
      const id = await entry.resolveUserId(provider, subject);
      return id ? await resolveExternalIdentity(id) : null;
    } catch {
      return null;
    }
  }
  return {
    ...authConfig,
    providers: [
      Credentials({
        credentials: {
          // i18n-ignore
          email: { label: "email" },
          password: { label: "password", type: "password" },
        },
        authorize,
      }),
      ...external.map((entry) => entry.provider),
    ],
    callbacks: {
      ...authConfig.callbacks,
      async signIn({ account }) {
        if (account?.provider === "credentials") return true;
        return Boolean(account && await resolve(account.provider, account.providerAccountId));
      },
      async jwt(args) {
        if (args.account && args.account.provider !== "credentials") {
          const identity = await resolve(args.account.provider, args.account.providerAccountId);
          if (!identity) return null;
          return authConfig.callbacks.jwt({ ...args, user: identity });
        }
        return authConfig.callbacks.jwt(args);
      },
    },
  };
});
