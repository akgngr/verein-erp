import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import type { ActionResult } from "@/shared/types/action";

/**
 * Sunucu ActionResult'ını react-hook-form durumuna işler (10.4):
 * alan bazlı hatalar `setError` ile ilgili alanın altına yazılır,
 * genel hata mesajı dönüş değeri olarak verilir (FormErrorSummary'de gösterilir).
 */
export function applyActionResult<T extends FieldValues>(
  result: ActionResult<unknown>,
  setError: UseFormSetError<T>,
): string | null {
  if (result.ok) return null;

  if (result.fieldErrors) {
    for (const [field, messages] of Object.entries(result.fieldErrors)) {
      if (field === "_form" || messages.length === 0) continue;
      setError(field as Path<T>, { type: "server", message: messages[0] }, { shouldFocus: true });
    }
  }
  return result.error;
}

/**
 * react-hook-form kullanmayan küçük formlar için: genel hata + alan hataları tek metinde
 * ("Tarihler tutarlı değil — Ödeme tarihi üyenin giriş tarihinden önce olamaz.").
 */
export function describeActionError(result: ActionResult<unknown>): string | null {
  if (result.ok) return null;
  const details = [...new Set(Object.values(result.fieldErrors ?? {}).flat())].filter((message) => message && message !== result.error);
  return details.length ? `${result.error} — ${details.join(" ")}` : result.error;
}
