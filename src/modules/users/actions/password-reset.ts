"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { writeAudit } from "@/shared/audit/write-audit";
import { passwordSchema } from "@/shared/security/password";
import { consumeRateLimit, hashRateLimitSubject } from "@/shared/security/rate-limit";
import type { ActionResult } from "@/shared/types/action";

import { acceptInvitation, InvitationError } from "../services/invitations";
import { requestPasswordReset } from "../services/password-reset";

const RESET_ACCEPT_IP_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000, backoffMs: 15 * 60 * 1000 } as const;

async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
  } catch {
    return null;
  }
}

function formErrors(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) (fieldErrors[issue.path.join(".") || "_form"] ??= []).push(issue.message);
  return { ok: false, error: "common.errors.formInvalid", fieldErrors };
}

const requestSchema = z.object({ email: z.string().trim().max(254).email("users.passwordReset.errors.email") }).strict();

/**
 * #603 — public (no session): request a reset link. Always answers with the same neutral result for known and
 * unknown addresses; the lookup and the mail run after the response (`after`), so timing reveals nothing either.
 */
export async function requestPasswordResetAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return formErrors(parsed.error);
  const outcome = await requestPasswordReset(
    { email: parsed.data.email, clientIp: await clientIp() },
    { schedule: (task) => after(task) },
  );
  if (outcome === "rateLimited") return { ok: false, error: "users.passwordReset.errors.rateLimited" };
  return { ok: true, data: null };
}

const resetSchema = z.object({ token: z.string().min(40).max(64), password: passwordSchema, confirm: z.string() }).strict()
  .refine((value) => value.password === value.confirm, { path: ["confirm"], message: "users.invite.errors.mismatch" });

/**
 * #603 — public: set a new password with a valid reset link (IP rate-limited). Clears the lockout; the new password
 * hash changes the session version, so every existing session ends; other pending links are revoked.
 */
export async function resetPasswordAction(input: unknown): Promise<ActionResult<null>> {
  const ip = await clientIp();
  if (ip) {
    const rate = await consumeRateLimit(`reset:accept:ip:${hashRateLimitSubject(ip)}`, RESET_ACCEPT_IP_LIMIT);
    if (!rate.allowed) return { ok: false, error: "users.passwordReset.errors.rateLimited" };
  }
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return formErrors(parsed.error);
  try {
    const { userId } = await acceptInvitation(parsed.data.token, parsed.data.password, new Date(), "RESET");
    await writeAudit({ action: "PASSWORD_RESET", entity: "User", entityId: userId, userId, userLabel: "password-reset" }).catch(() => undefined);
    return { ok: true, data: null };
  } catch (error) {
    if (error instanceof InvitationError) return { ok: false, error: "users.passwordReset.errors.invalid" };
    throw error;
  }
}
