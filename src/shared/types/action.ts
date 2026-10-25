/**
 * Tüm server action'ların ortak dönüş tipi (10.1).
 * Formlar `ok: false` durumunda `error` (genel) ve `fieldErrors` (alan bazlı) gösterir.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
