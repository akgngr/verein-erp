import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getDb } from "@/shared/db";
import { hashPassword } from "@/shared/security/password";

/**
 * Invitation links: one-time, 72 h, only the SHA-256 of the token is stored. The mail contains just the link;
 * the invitee sets their own password. A new invitation revokes older unused ones for the same user.
 */
export const INVITATION_TTL_HOURS = 72;
export const INVITATION_PATH = "/davet";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const TOKEN = /^[A-Za-z0-9_-]{40,64}$/;

export class InvitationError extends Error {}

/** #603: INVITE = admin invitation (72 h); RESET = self-service password reset (30 min). Tokens never cross purposes. */
export type PasswordLinkPurpose = "INVITE" | "RESET";
export const RESET_TTL_MINUTES = 30;

const ttlMs = (purpose: PasswordLinkPurpose) => (purpose === "RESET" ? RESET_TTL_MINUTES * 60_000 : INVITATION_TTL_HOURS * 3_600_000);

export async function createInvitation(
  userId: string,
  actorId: string,
  now = new Date(),
  purpose: PasswordLinkPurpose = "INVITE",
): Promise<{ token: string; expiresAt: Date }> {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + ttlMs(purpose));
  await db.$transaction([
    db.userInvitation.updateMany({ where: { userId, purpose, usedAt: null, revokedAt: null }, data: { revokedAt: now } }),
    db.userInvitation.create({ data: { userId, purpose, tokenHash: sha(token), expiresAt, createdById: actorId } }),
  ]);
  return { token, expiresAt };
}

/** Pure: link for the mail. */
export function invitationLink(appUrl: string, token: string): string | null {
  try {
    const origin = new URL(appUrl);
    if (origin.protocol !== "https:" && origin.hostname !== "localhost") return null;
    return new URL(`${INVITATION_PATH}/${token}`, origin.origin).toString();
  } catch {
    return null;
  }
}

/** Is the token currently usable? (used/expired/revoked/inactive user → null) */
export async function findUsableInvitation(
  token: string,
  now = new Date(),
  purpose: PasswordLinkPurpose = "INVITE",
): Promise<{ id: string; userId: string; email: string; name: string } | null> {
  if (!TOKEN.test(token)) return null;
  const db = getDb();
  const invitation = await db.userInvitation.findUnique({ where: { tokenHash: sha(token) } });
  if (!invitation || invitation.purpose !== purpose || invitation.usedAt || invitation.revokedAt || invitation.expiresAt <= now) return null;
  const user = await db.user.findUnique({ where: { id: invitation.userId }, select: { id: true, email: true, name: true, isActive: true } });
  if (!user?.isActive) return null;
  return { id: invitation.id, userId: user.id, email: user.email, name: user.name };
}

/** Sets the invitee's password and consumes the invitation atomically (a second use fails). */
export async function acceptInvitation(
  token: string,
  password: string,
  now = new Date(),
  purpose: PasswordLinkPurpose = "INVITE",
): Promise<{ userId: string }> {
  const usable = await findUsableInvitation(token, now, purpose);
  if (!usable) throw new InvitationError("users.invite.errors.invalid");
  const db = getDb();
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    const targetUser = await tx.user.findUnique({ where: { id: usable.userId }, select: { isActive: true } });
    if (!targetUser?.isActive) throw new InvitationError("users.invite.errors.invalid");
    const consumed = await tx.userInvitation.updateMany({
      where: { id: usable.id, purpose, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) throw new InvitationError("users.invite.errors.invalid");
    // Diğer bekleyen bağlantılar (davet ve sıfırlama) parolayla birlikte geçersiz olur.
    await tx.userInvitation.updateMany({ where: { userId: usable.userId, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
    await tx.user.update({
      where: { id: usable.userId },
      data: { passwordHash, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null },
    });
    return { userId: usable.userId };
  });
}

export function inviteMail(locale: "tr" | "de", input: { name: string; link: string; expiresAt: Date }): { subject: string; text: string } {
  const until = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(input.expiresAt);
  return locale === "de"
    ? { subject: "Einladung zu Verein ERP", text: `Hallo ${input.name},\n\nSie wurden zu Verein ERP eingeladen. Legen Sie über diesen einmaligen Link Ihr Passwort fest (gültig bis ${until}):\n\n${input.link}\n\nWenn Sie diese Einladung nicht erwartet haben, ignorieren Sie diese E-Mail.` }
    : { subject: "Verein ERP daveti", text: `Merhaba ${input.name},\n\nVerein ERP'ye davet edildiniz. Şifrenizi bu tek kullanımlık bağlantıdan belirleyin (${until} tarihine kadar geçerli):\n\n${input.link}\n\nBu daveti beklemiyorsanız bu e-postayı dikkate almayın.` };
}
