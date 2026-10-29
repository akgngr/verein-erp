"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, requireUser } from "../server";
import { unstable_update } from "../auth";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";

/**
 * Kullanıcının arayüz dilini değiştirir.
 *
 * KARAR (Verein pivotu): 3 adımda çalışır:
 *   1. User.locale alanını günceller (kalıcı tercih)
 *   2. NEXT_LOCALE çerezini yazar (next-intl'in okuduğu kaynak)
 *   3. unstable_update ile JWT'yi tazeler — böylece session.user.locale güncel olur
 *      ve sonraki istekler hemen yeni dilde çalışır.
 *
 * Şema: yalnızca desteklenen dilleri kabul eder (SUPPORTED_LOCALES). Varsayılan
 * "tr"; "de" diğer dil. İlave dil eklendiğinde config.ts ve messages/ güncellenir.
 */
const setLocaleSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES as unknown as [Locale, ...Locale[]]),
});

export async function setLocaleAction(input: unknown): Promise<ActionResult<Locale>> {
  // KARAR: createAction yerine elle yönetiyoruz çünkü bu aksiyon başarılı
  // olduğunda unstable_update()'i çağırmamız gerekiyor (genel createAction bunu
  // desteklemiyor). Oturum/zod/hata akımı yine aynı kalıpla uygulanır.
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof ActionError) {
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

  // JWT'yi tazele ki session.user.locale da güncel olsun.
  await unstable_update({ user: { locale: newLocale } as never });

  return { ok: true, data: newLocale };
}
