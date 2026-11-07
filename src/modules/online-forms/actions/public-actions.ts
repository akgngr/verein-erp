"use server";

import { getTranslations } from "next-intl/server";

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
  const ok = await submitPublicForm(parsed.data, (name) => t("updatedBy", { name }));
  return ok ? { ok: true } : { ok: false, error: "online-forms.errors.linkInvalid" };
}
