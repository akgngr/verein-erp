"use server";

import { AuthError, CredentialsSignin } from "next-auth";

import type { ActionResult } from "@/shared/types/action";

import { signIn } from "../auth";
import { loginSchema } from "../schemas/login";

/** CredentialsSignin "code" değeri → kullanıcıya gösterilecek Türkçe mesaj. */
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-posta veya parola hatalı.",
  account_locked: "Hesap geçici olarak kilitlendi, daha sonra tekrar deneyin.",
};

export async function loginAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: "Lütfen formdaki hataları düzeltin.", fieldErrors };
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
        (error.code && LOGIN_ERROR_MESSAGES[error.code]) || "E-posta veya parola hatalı.";
      return { ok: false, error: message };
    }
    if (error instanceof AuthError) {
      return { ok: false, error: "Giriş yapılamadı. Lütfen tekrar deneyin." };
    }
    // NEXT_REDIRECT gibi framework hataları aynen fırlatılır.
    throw error;
  }

  return { ok: true, data: null };
}
