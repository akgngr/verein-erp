/** Pure validation shared by the linking service and tests. */
export function validReturnPath(path: string): boolean {
  return /^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path);
}
export function validLinkToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
export type LinkIntentBinding = { userId: string; provider: string; sessionVersion: string; expiresAt: Date };
export function matchesLinkIntent(intent: LinkIntentBinding, input: { userId: string; provider: string; sessionVersion: string | undefined; twoFactorEnabled: boolean; now: Date }): boolean {
  return !input.twoFactorEnabled && Boolean(input.sessionVersion) && intent.userId === input.userId &&
    intent.provider === input.provider && intent.sessionVersion === input.sessionVersion &&
    intent.expiresAt > input.now;
}

/** A callback carrying link evidence must never fall back to ordinary sign-in. */
export function linkCallbackDisposition(input: { cookiePresent: boolean; authenticated: boolean; intentMatches: boolean }): "login" | "denied" | "link" {
  if (!input.cookiePresent) return input.authenticated ? "denied" : "login";
  return input.intentMatches && input.authenticated ? "link" : "denied";
}
