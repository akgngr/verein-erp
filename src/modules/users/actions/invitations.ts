"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { passwordSchema } from "@/shared/security/password";
import { consumeRateLimit, hashRateLimitSubject } from "@/shared/security/rate-limit";
import type { ActionResult } from "@/shared/types/action";

import { usersPermissions } from "../permissions";
import { acceptInvitation, InvitationError } from "../services/invitations";
import { sendInvitationTo } from "../services/invitation-mail";

const INVITE_ACCEPT_IP_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000, backoffMs: 15 * 60 * 1000 } as const;

async function getRequestClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    const real = h.get("x-real-ip")?.trim();
    return forwarded || real || null;
  } catch {
    return null;
  }
}

/** Admin: send a one-time invitation link (72 h) to an active user. Audit holds no token. */
export async function inviteUserAction(input: unknown): Promise<ActionResult<{ expiresAt: string }>> {
  return createAction({
    permission: { definition: usersPermissions, action: "update" },
    schema: z.object({ id: z.string().min(1) }).strict(),
    handler: async ({ input, user, audit }) => {
      const target = await getDb().user.findUnique({ where: { id: input.id }, select: { id: true, name: true, email: true, locale: true, isActive: true, role: true } });
      if (!target) throw new ActionError("users.errors.notFound");
      if (!target.isActive) throw new ActionError("users.invite.errors.inactive");
      if (target.role === "ADMIN" && user.role !== "ADMIN") throw new ActionError("users.errors.adminOnly");
      const expiresAt = await sendInvitationTo(target, user.id);
      await audit({ action: "USER_INVITE", entity: "User", entityId: target.id, after: { expiresAt: expiresAt.toISOString() } });
      return { expiresAt: expiresAt.toISOString() };
    },
  })(input);
}

const acceptSchema = z.object({ token: z.string().min(40).max(64), password: passwordSchema, confirm: z.string() }).strict()
  .refine((value) => value.password === value.confirm, { path: ["confirm"], message: "users.invite.errors.mismatch" });

/** Public (no session): set the password with a valid invitation token (IP rate-limited). */
export async function acceptInvitationAction(input: unknown): Promise<ActionResult<null>> {
  const clientIp = await getRequestClientIp();
  if (clientIp) {
    const rate = await consumeRateLimit(
      `invite:accept:ip:${hashRateLimitSubject(clientIp)}`,
      INVITE_ACCEPT_IP_LIMIT,
    );
    if (!rate.allowed) {
      return { ok: false, error: "users.invite.errors.rateLimited" };
    }
  }
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (fieldErrors[issue.path.join(".") || "_form"] ??= []).push(issue.message);
    return { ok: false, error: "common.errors.formInvalid", fieldErrors };
  }
  try {
    const { userId } = await acceptInvitation(parsed.data.token, parsed.data.password);
    await writeAudit({ action: "USER_INVITE_ACCEPT", entity: "User", entityId: userId, userId, userLabel: "invitation" }).catch(() => undefined);
    return { ok: true, data: null };
  } catch (error) {
    if (error instanceof InvitationError) return { ok: false, error: error.message };
    throw error;
  }
}
