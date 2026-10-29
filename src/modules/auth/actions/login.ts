"use server";

import { AuthError, CredentialsSignin } from "next-auth";

import type { ActionResult } from "@/shared/types/action";

import { signIn } from "../auth";
import { loginSchema } from "../schemas/login";

/**
 * CredentialsSignin "code" değeri → mesaj anahtarı. Giriş sayfası henüz
 * oturumsuz olduğundan anahtarlar istemcide (FormErrorSummary) çevrilir.
 */
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "auth.errors.invalidCredentials",
  account_locked: "auth.errors.accountLocked",
};

export async function loginAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: "common.errors.formInvalid", fieldErrors };
  }

  try {
    // Başarı durumunda Auth.js "/" adresine yönlendirir (NEXT_REDIRECT);
    // middleware, parola değiştirmesi gereken kullanıcıyı /profil'e alır.
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      const message =
        (error.code && LOGIN_ERROR_MESSAGES[error.code]) || "auth.errors.invalidCredentials";
      return { ok: false, error: message };
    }
    if (error instanceof AuthError) {
      return { ok: false, error: "auth.errors.loginFailed" };
    }
    // NEXT_REDIRECT gibi framework hataları aynen fırlatılır.
    throw error;
  }

  return { ok: true, data: null };
}
