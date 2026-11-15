/**
 * Evrak metnini buluta göndermeden önce maskeler (docs/specs/DOCUMENTS_AI.md, EV-2).
 * Sohbet taramasından farkı: evrak doğal olarak adres/IBAN/ad içerir; bu yüzden metin REDDEDİLMEZ,
 * kişisel parçalar yer tutucuyla değiştirilir. Yalnız özel nitelikli veri (sağlık, din …) bir kişiyle
 * birlikte geçerse buluta gönderilmez (yerel model gerekir).
 * Saf fonksiyon; yer tutucular yalnız bu istekte, sunucu belleğinde geri çözülür.
 */
import { hasSpecialCategory, preflightCloudText, type FindingKind } from "./cloud-preflight";
import { PseudonymVault } from "./privacy";

export type MaskedDocument =
  | { ok: true; text: string; restore: (value: string) => string; masked: number }
  | { ok: false; reason: "specialCategory" };

const SPAN_KIND: Partial<Record<FindingKind, string>> = {
  TITLED_NAME: "NAME",
  LIKELY_NAME: "NAME",
  ADDRESS: "ADDRESS",
  BIRTHDATE: "BIRTHDATE",
  EMAIL: "EMAIL",
  PHONE: "PHONE",
  IBAN: "IBAN",
  TAXID: "TAXID",
};

export function maskDocumentForCloud(text: string, known: { names: string[]; references: string[] }): MaskedDocument {
  // 1. Kayıtlı kişiler ve doğrudan tanımlayıcılar (e-posta, IBAN, telefon, vergi no) → [PERSON_n] / [IBAN_n] …
  const vault = new PseudonymVault(known);
  let masked = vault.redact(text);

  // 2. Bilinmeyen adlar, adresler, doğum tarihleri: tarama bulgularının aralıkları yer tutucuyla değiştirilir.
  const scan = preflightCloudText(masked, [], () => "");
  const findings = scan.ok ? [] : scan.findings;
  const mentionsPerson = vault.size > 0 && /\[PERSON_\d+\]/.test(masked) || findings.some((finding) => finding.kind === "TITLED_NAME" || finding.kind === "LIKELY_NAME");
  if (findings.some((finding) => finding.kind === "SPECIAL_CATEGORY") || (mentionsPerson && hasSpecialCategory(masked))) return { ok: false, reason: "specialCategory" };

  const spans = findings
    .filter((finding) => SPAN_KIND[finding.kind])
    .sort((a, b) => a.start - b.start)
    .filter((finding, index, list) => index === 0 || finding.start >= list[index - 1].end);
  const local = new Map<string, string>();
  const counters = new Map<string, number>();
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    const kind = SPAN_KIND[span.kind]!;
    const next = (counters.get(kind) ?? 0) + 1;
    counters.set(kind, next);
    const token = `[DOC_${kind}_${next}]`;
    local.set(token, masked.slice(span.start, span.end));
    out += masked.slice(cursor, span.start) + token;
    cursor = span.end;
  }
  masked = out + masked.slice(cursor);

  const restore = (value: string) => vault.restore(value.replace(/\[DOC_[A-Z]+_\d+\]/g, (token) => local.get(token) ?? token));
  return { ok: true, text: masked, restore, masked: vault.size + local.size };
}
