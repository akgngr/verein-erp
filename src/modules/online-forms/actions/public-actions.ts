"use server";

import { getTranslations } from "next-intl/server";

import { queueSignedPdf } from "../services/pdf-queue";
import { submitSchema } from "../lib/schemas";
import { submitPublicForm } from "../services/requests";

/**
 * OTURUMSUZ: yalnız geçerli, süresi dolmamış, bekleyen bir belirteçle çalışır. Kimlik doğrulaması
 * belirtecin kendisidir (32 bayt rastgele; kişinin kendi e-posta/telefonuna gider).
 */
export async function submitOnlineFormAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string; fields?: Record<string, string> }> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "online-forms.errors.invalid", fields };
  }
  const t = await getTranslations("online-forms");
  const result = await submitPublicForm(parsed.data, (name) => t("updatedBy", { name }), (org) => ({
    privacy: t("public.privacy", { org }),
    photo: t(parsed.data.student && !parsed.data.member && parsed.data.guardian ? "public.photoChild" : "public.photo"),
    sepa: t("public.sepaMandate", { org }),
  }));
  if (result === "textsChanged") return { ok: false, error: "online-forms.errors.textsChanged" };
  if (!result) return { ok: false, error: "online-forms.errors.linkInvalid" };
  // PDF arka planda (worker) üretilip saklanır; kuyruk yoksa burada üretilir. İndirmede yoksa kanıt kaydından üretilir.
  await queueSignedPdf(result);
  return { ok: true };
}
