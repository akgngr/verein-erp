"use server";

import { z } from "zod";

import { getDb } from "@/shared/db";
import { verifyPassword } from "@/shared/security/password";
import { consumeRateLimit } from "@/shared/security/rate-limit";

import { ActionError } from "../errors";
import { createAction } from "../server";
import {
  confirmTotpEnrolment, getTwoFactorStatus, regenerateRecoveryCodes, removeTwoFactor, startTotpEnrolment,
  TwoFactorError, verifySecondFactor,
} from "../services/two-factor";

/**
 * #603 — /profil: optional TOTP second factor. Starting enrolment and turning it off re-authenticate with the
 * current password; turning it off and replacing recovery codes also need a current code. Code checks are
 * rate-limited per user, so a stolen session cannot guess codes.
 */
const passwordField = z.string().min(1, "auth.errors.currentPasswordWrong").max(200);
const codeField = z.string().trim().min(6, "auth.twoFactor.errors.codeInvalid").max(32);
const CODE_RATE_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 } as const;

async function requireCurrentPassword(userId: string, password: string): Promise<{ email: string }> {
  const dbUser = await getDb().user.findUnique({ where: { id: userId }, select: { email: true, passwordHash: true, isActive: true } });
  if (!dbUser?.isActive) throw new ActionError("auth.errors.sessionInvalid");
  if (!(await verifyPassword(password, dbUser.passwordHash))) {
    throw new ActionError("auth.errors.currentPasswordWrong", { currentPassword: ["auth.errors.currentPasswordWrong"] });
  }
  return { email: dbUser.email };
}

async function limitCodeChecks(userId: string): Promise<void> {
  const rate = await consumeRateLimit(`2fa:code:${userId}`, CODE_RATE_LIMIT);
  if (!rate.allowed) throw new ActionError("auth.errors.rateLimited");
}

async function requireSecondFactor(userId: string, code: string): Promise<void> {
  await limitCodeChecks(userId);
  if (!(await verifySecondFactor(userId, code))) {
    throw new ActionError("auth.twoFactor.errors.codeInvalid", { code: ["auth.twoFactor.errors.codeInvalid"] });
  }
}

function asActionError(error: unknown): never {
  if (error instanceof TwoFactorError) throw new ActionError(error.message);
  throw error;
}

export async function twoFactorStatusAction(input: unknown = {}) {
  return createAction({
    schema: z.object({}).strict(),
    handler: async ({ user }) => getTwoFactorStatus(user.id),
  })(input);
}

export async function startTwoFactorEnrolmentAction(input: unknown) {
  return createAction({
    schema: z.object({ currentPassword: passwordField }).strict(),
    handler: async ({ input, user }) => {
      const { email } = await requireCurrentPassword(user.id, input.currentPassword);
      return startTotpEnrolment(user.id, email).catch(asActionError);
    },
  })(input);
}

export async function confirmTwoFactorEnrolmentAction(input: unknown) {
  return createAction({
    schema: z.object({ code: codeField }).strict(),
    handler: async ({ input, user, audit }) => {
      await limitCodeChecks(user.id);
      const result = await confirmTotpEnrolment(user.id, input.code).catch(asActionError);
      await audit({ action: "UPDATE", entity: "User", entityId: user.id, after: { twoFactor: "enabled" } });
      return result;
    },
  })(input);
}

export async function disableTwoFactorAction(input: unknown) {
  return createAction({
    schema: z.object({ currentPassword: passwordField, code: codeField }).strict(),
    handler: async ({ input, user, audit }) => {
      await requireCurrentPassword(user.id, input.currentPassword);
      await requireSecondFactor(user.id, input.code);
      await removeTwoFactor(user.id);
      await audit({ action: "UPDATE", entity: "User", entityId: user.id, after: { twoFactor: "disabled" } });
      return undefined;
    },
  })(input);
}

export async function regenerateRecoveryCodesAction(input: unknown) {
  return createAction({
    schema: z.object({ code: codeField }).strict(),
    handler: async ({ input, user, audit }) => {
      await requireSecondFactor(user.id, input.code);
      const recoveryCodes = await regenerateRecoveryCodes(user.id);
      await audit({ action: "UPDATE", entity: "User", entityId: user.id, after: { twoFactor: "recoveryCodesReplaced" } });
      return { recoveryCodes };
    },
  })(input);
}
