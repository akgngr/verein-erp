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

export async function createInvitation(userId: string, actorId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_HOURS * 3_600_000);
  await db.$transaction([
    db.userInvitation.updateMany({ where: { userId, usedAt: null, revokedAt: null }, data: { revokedAt: now } }),
    db.userInvitation.create({ data: { userId, tokenHash: sha(token), expiresAt, createdById: actorId } }),
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
export async function findUsableInvitation(token: string, now = new Date()): Promise<{ id: string; userId: string; email: string; name: string } | null> {
  if (!TOKEN.test(token)) return null;
  const db = getDb();
  const invitation = await db.userInvitation.findUnique({ where: { tokenHash: sha(token) } });
  if (!invitation || invitation.usedAt || invitation.revokedAt || invitation.expiresAt <= now) return null;
  const user = await db.user.findUnique({ where: { id: invitation.userId }, select: { id: true, email: true, name: true, isActive: true } });
  if (!user?.isActive) return null;
  return { id: invitation.id, userId: user.id, email: user.email, name: user.name };
}

/** Sets the invitee's password and consumes the invitation atomically (a second use fails). */
export async function acceptInvitation(token: string, password: string, now = new Date()): Promise<{ userId: string }> {
  const usable = await findUsableInvitation(token, now);
  if (!usable) throw new InvitationError("users.invite.errors.invalid");
  const db = getDb();
  const passwordHash = await hashPassword(password);
  const consumed = await db.userInvitation.updateMany({ where: { id: usable.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
  if (consumed.count !== 1) throw new InvitationError("users.invite.errors.invalid");
  await db.user.update({ where: { id: usable.userId }, data: { passwordHash, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null } });
  return { userId: usable.userId };
}

export function inviteMail(locale: "tr" | "de", input: { name: string; link: string; expiresAt: Date }): { subject: string; text: string } {
  const until = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(input.expiresAt);
  return locale === "de"
    ? { subject: "Einladung zu Verein ERP", text: `Hallo ${input.name},\n\nSie wurden zu Verein ERP eingeladen. Legen Sie über diesen einmaligen Link Ihr Passwort fest (gültig bis ${until}):\n\n${input.link}\n\nWenn Sie diese Einladung nicht erwartet haben, ignorieren Sie diese E-Mail.` }
    : { subject: "Verein ERP daveti", text: `Merhaba ${input.name},\n\nVerein ERP'ye davet edildiniz. Şifrenizi bu tek kullanımlık bağlantıdan belirleyin (${until} tarihine kadar geçerli):\n\n${input.link}\n\nBu daveti beklemiyorsanız bu e-postayı dikkate almayın.` };
}
