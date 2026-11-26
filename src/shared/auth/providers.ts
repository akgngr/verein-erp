import type { NextAuthConfig } from "next-auth";

export type ExternalAuthProvider = Extract<NextAuthConfig["providers"][number], { id: string }>;

export type ModuleAuthProviders = {
  module: string;
  load: () => Promise<readonly ExternalAuthProvider[]>;
  resolveUserId: (providerId: string, subject: string) => Promise<string | null>;
};

export type RegisteredAuthProvider = {
  provider: ExternalAuthProvider;
  resolveUserId: ModuleAuthProviders["resolveUserId"];
};

/** Unavailable modules and duplicate IDs must never affect password login. */
export async function collectAuthProviders(
  modules: readonly ModuleAuthProviders[],
  available: (key: string) => Promise<boolean>,
): Promise<RegisteredAuthProvider[]> {
  const entries = new Map<string, RegisteredAuthProvider>();
  const duplicates = new Set<string>(["credentials"]);
  for (const module of modules) {
    try {
      if (!(await available(module.module))) continue;
      for (const provider of await module.load()) {
        if (!provider.id || !["oauth", "oidc"].includes(provider.type)) continue;
        if (entries.has(provider.id)) duplicates.add(provider.id);
        entries.set(provider.id, { provider, resolveUserId: module.resolveUserId });
      }
    } catch {
      // Do not log provider configuration or secrets.
    }
  }
  return [...entries].filter(([id]) => !duplicates.has(id)).map(([, entry]) => entry);
}
