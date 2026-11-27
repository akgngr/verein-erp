"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, UnauthorizedError, requireUser } from "../server";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";

/**
 * Kullanıcının arayüz dilini değiştirir.
 *
 * KARAR (Verein pivotu):
 *   1. User.locale alanını günceller (kalıcı tercih)
 *   2. NEXT_LOCALE çerezini yazar (next-intl'in okuduğu kaynak)
 */
const setLocaleSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES as unknown as [Locale, ...Locale[]]),
});

export async function setLocaleAction(input: unknown): Promise<ActionResult<Locale>> {
  let user;
  try {
    user = await requireUser({ allowPasswordChangePending: true });
  } catch (error) {
    if (error instanceof ActionError || error instanceof UnauthorizedError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const parsed = setLocaleSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: "auth.errors.invalidLocale", fieldErrors };
  }

  const newLocale = parsed.data.locale;

  // Kullanıcının tercihini DB'ye yaz.
  await getDb().user.update({
    where: { id: user.id },
    data: { locale: newLocale },
  });

  // Çerez: next-intl NEXT_LOCALE çerezini okur. 1 yıl geçerli, tüm rotalar.
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", newLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false, // next-intl client tarafında da okuyor olabilir; güvenli tutuyoruz
  });

  return { ok: true, data: newLocale };
}
