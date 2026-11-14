/** Request-independent decision; loaders must return current server state. */
export async function checkCurrentAiAccess<T extends { id: string }>(
  expectedUserId: string,
  expectedProvider: string | undefined,
  dependencies: {
    user: () => Promise<T>;
    modules: () => Promise<string[]>;
    consent: (userId: string) => Promise<boolean>;
    provider: () => Promise<string | null>;
    allowed: (user: T) => boolean;
  },
): Promise<{ user: T; modules: string[]; provider: string } | null> {
  const user = await dependencies.user();
  const [modules, consent, provider] = await Promise.all([dependencies.modules(), dependencies.consent(user.id), dependencies.provider()]);
  if (user.id !== expectedUserId || !modules.includes("ai") || !dependencies.allowed(user) || !consent || !provider || (expectedProvider && provider !== expectedProvider)) return null;
  return { user, modules, provider };
}
