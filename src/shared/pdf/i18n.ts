/**
 * PDF dil yardımcıları (Faz 4, 4.3).
 *
 * KARAR: Resmi PDF'ler Almanca VARSAYILAN (DOCUMENT_LANGUAGE=de); `?lang=tr`
 * ile Türkçe üretilir. Sorgu parametresi geçersizse ortam değeri kullanılır.
 */

export type PdfLang = "de" | "tr";

const VALID: PdfLang[] = ["de", "tr"];

export function isPdfLang(value: string | null | undefined): value is PdfLang {
  return value !== null && value !== undefined && (VALID as string[]).includes(value);
}

/**
 * `?lang=` sorgu parametresi → geçerliyse kullan; değilse env DOCUMENT_LANGUAGE
 * (zod enum de|tr, varsayılan "de").
 */
export function resolvePdfLang(request: Request): PdfLang {
  const url = new URL(request.url);
  const param = url.searchParams.get("lang");
  if (isPdfLang(param)) return param;
  return getEnvPdfLang();
}

import { getEnv } from "../env";

function getEnvPdfLang(): PdfLang {
  const value = getEnv().DOCUMENT_LANGUAGE;
  return value === "tr" ? "tr" : "de";
}
