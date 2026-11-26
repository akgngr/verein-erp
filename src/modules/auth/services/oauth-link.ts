import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/shared/db";
import { consumeRateLimit } from "@/shared/security/rate-limit";
import { ActionError } from "../errors";
import { authorize } from "./authorize";
import { linkAuthIdentity } from "./oauth-identity";
import { loadEnabledAuthProviders } from "./oauth-providers";
import { isTwoFactorEnabled } from "./two-factor";
import { validReturnPath, validLinkToken, matchesLinkIntent } from "./oauth-link-policy";

const COOKIE = "verein-oauth-link";
const TTL_SECONDS = 300;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");


/** Provider-agnostic linking intent, created only after reauthenticating the current ERP user. */
export async function prepareAuthIdentityLink(input: { provider: string; password: string; returnPath: string }): Promise<void> {
  const { requireUser, auth } = await import("../server");
  const user = await requireUser();
  const session = await auth();
  const version = (session?.user as { sessionVersion?: string } | undefined)?.sessionVersion;
  if (!version || session?.user?.id !== user.id || !validReturnPath(input.returnPath)) {
    throw new ActionError("auth.oauth.errors.invalidLink");
  }
  if (!(await loadEnabledAuthProviders()).ids.includes(input.provider)) throw new ActionError("auth.oauth.errors.invalidLink");
  // Existing OAuth sign-in deliberately disallows TOTP-enabled users. Do not enrol a weaker fallback.
  if (await isTwoFactorEnabled(user.id)) throw new ActionError("auth.oauth.errors.invalidLink");
  if (!(await consumeRateLimit(`auth:oauth-link:${user.id}`, { limit: 5, windowMs: 900000 })).allowed) {
    throw new ActionError("auth.errors.rateLimited");
  }
  let verified: Awaited<ReturnType<typeof authorize>>;
  try {
    verified = await authorize({ email: user.email, password: input.password });
  } catch {
    throw new ActionError("auth.errors.currentPasswordWrong");
  }
  if (verified.id !== user.id || verified.sessionVersion !== version || verified.mustChangePassword) {
    throw new ActionError("auth.oauth.errors.invalidLink");
  }
  const token = randomBytes(32).toString("base64url");
  const db = getDb();
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.authOAuthLinkIntent.deleteMany({ where: { OR: [{ userId: user.id }, { expiresAt: { lte: now } }] } });
    await tx.authOAuthLinkIntent.create({ data: {
      tokenHash: hash(token), userId: user.id, sessionVersion: version,
      provider: input.provider, returnPath: input.returnPath,
      expiresAt: new Date(now.getTime() + TTL_SECONDS * 1000),
    } });
  });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: TTL_SECONDS });
}

/**
 * Called only from Auth.js after its OAuth/OIDC state and provider response validation.
 * A pending intent is never treated as ordinary login, even on failure. No new session is issued.
 */
export async function completeAuthIdentityLink(provider: string, subject: string): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  jar.delete(COOKIE);
  let returnPath = "/profil";
  try {
    if (!validLinkToken(token) || !subject) return returnPath + "?oauthLink=denied";
    const db = getDb();
    const tokenHash = hash(token);
    const intent = await db.authOAuthLinkIntent.findUnique({ where: { tokenHash } });
    if (!intent || !validReturnPath(intent.returnPath)) return returnPath + "?oauthLink=denied";
    returnPath = intent.returnPath;
    const { requireUser, auth } = await import("../server");
    const user = await requireUser();
    const session = await auth();
    const version = (session?.user as { sessionVersion?: string } | undefined)?.sessionVersion;
    if (session?.user?.id !== user.id || !matchesLinkIntent(intent, { userId: user.id, provider, sessionVersion: version, twoFactorEnabled: await isTwoFactorEnabled(user.id), now: new Date() })) return returnPath + "?oauthLink=denied";
    const claimed = await db.authOAuthLinkIntent.deleteMany({ where: {
      tokenHash, userId: user.id, provider, sessionVersion: version, expiresAt: { gt: new Date() },
    } });
    if (claimed.count !== 1) return returnPath + "?oauthLink=denied";
    const existing = await db.authIdentity.findFirst({ where: { provider, userId: user.id } });
    if (existing && existing.subject !== subject) return returnPath + "?oauthLink=denied";
    await linkAuthIdentity({ provider, subject, userId: user.id, actorId: user.id });
    return returnPath + "?oauthLink=success";
  } catch {
    return returnPath + "?oauthLink=denied";
  }
}
