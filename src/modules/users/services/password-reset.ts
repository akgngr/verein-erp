import "server-only";

import { getEnv } from "@/shared/env";
import { getDb } from "@/shared/db";
import { consumeRateLimit, hashRateLimitSubject } from "@/shared/security/rate-limit";

import { createInvitation, RESET_TTL_MINUTES } from "./invitations";

/**
 * #603: Self-service password reset ("Forgot password?").
 * - The response never reveals whether an address exists (same result for known/unknown/inactive addresses).
 * - Rate limits: per client IP and per address hash, both before any lookup.
 * - The link is single-use, expires after 30 minutes and is stored hashed (`user_invitations`, purpose RESET).
 *   A new request revokes older reset links; setting the password revokes every pending link and changes the
 *   session version, so all existing sessions end.
 */
export const RESET_PATH = "/sifre-sifirla";
export const RESET_RATE_LIMITS = {
  perIp: { limit: 10, windowMs: 60 * 60 * 1000 },
  perAddress: { limit: 3, windowMs: 15 * 60 * 1000 },
} as const;

/** Pure: link for the mail (https only, except localhost for development). */
export function passwordResetLink(appUrl: string, token: string): string | null {
  try {
    const origin = new URL(appUrl);
    if (origin.protocol !== "https:" && origin.hostname !== "localhost") return null;
    return new URL(`${RESET_PATH}/${token}`, origin.origin).toString();
  } catch {
    return null;
  }
}

export function resetMail(locale: "tr" | "de", input: { name: string; link: string }): { subject: string; text: string } {
  return locale === "de"
    ? {
        subject: "Passwort zurücksetzen – Verein ERP",
        text: `Hallo ${input.name},\n\nfür Ihr Konto wurde das Zurücksetzen des Passworts angefordert. Legen Sie über diesen einmaligen Link ein neues Passwort fest (${RESET_TTL_MINUTES} Minuten gültig):\n\n${input.link}\n\nWenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail; Ihr Passwort bleibt unverändert.`,
      }
    : {
        subject: "Şifre sıfırlama – Verein ERP",
        text: `Merhaba ${input.name},\n\nhesabınız için şifre sıfırlama istendi. Yeni şifrenizi bu tek kullanımlık bağlantıdan belirleyin (${RESET_TTL_MINUTES} dakika geçerli):\n\n${input.link}\n\nBu isteği siz yapmadıysanız bu e-postayı dikkate almayın; şifreniz değişmez.`,
      };
}

export type ResetRequestOutcome = "accepted" | "rateLimited";
type Deliver = (message: { to: string; subject: string; text: string; reference: string }) => Promise<boolean>;

/**
 * Handles a reset request. Rate limits run first (before any lookup, so they reveal nothing). Everything that
 * depends on whether the address exists — lookup, token, mail — is handed to `schedule`; the action passes
 * Next's `after()`, so known and unknown addresses get the same response at the same speed. Tests run it inline.
 */
export async function requestPasswordReset(
  input: { email: string; clientIp: string | null },
  deps: { deliver?: Deliver; schedule?: (task: () => Promise<void>) => void | Promise<void> } = {},
  now = new Date(),
): Promise<ResetRequestOutcome> {
  const email = input.email.trim().toLowerCase();
  if (input.clientIp) {
    const perIp = await consumeRateLimit(`reset:ip:${hashRateLimitSubject(input.clientIp)}`, RESET_RATE_LIMITS.perIp, now);
    if (!perIp.allowed) return "rateLimited";
  }
  const perAddress = await consumeRateLimit(`reset:addr:${hashRateLimitSubject(email)}`, RESET_RATE_LIMITS.perAddress, now);
  if (!perAddress.allowed) return "rateLimited";

  const task = () => issuePasswordReset(email, deps.deliver ?? defaultDeliver, now).catch(() => undefined);
  if (deps.schedule) await deps.schedule(task);
  else await task();
  return "accepted";
}

async function issuePasswordReset(email: string, deliver: Deliver, now: Date): Promise<void> {
  const user = await getDb().user.findUnique({ where: { email }, select: { id: true, name: true, email: true, locale: true, isActive: true } });
  if (!user?.isActive) return;
  const appUrl = getEnv().APP_URL;
  if (!appUrl || !passwordResetLink(appUrl, "x".repeat(43))) return;
  const { token } = await createInvitation(user.id, user.id, now, "RESET");
  const link = passwordResetLink(appUrl, token)!;
  const message = resetMail(user.locale === "de" ? "de" : "tr", { name: user.name, link });
  await deliver({ to: user.email, ...message, reference: `password-reset:${user.id}` }).catch(() => false);
}

async function defaultDeliver(message: { to: string; subject: string; text: string; reference: string }): Promise<boolean> {
  const { isMailConfigured, sendMail } = await import("@/modules/mail/server");
  if (!(await isMailConfigured())) return false;
  const sent = await sendMail({ to: message.to, subject: message.subject, text: message.text, context: { module: "users", reference: message.reference } });
  return sent.ok;
}
