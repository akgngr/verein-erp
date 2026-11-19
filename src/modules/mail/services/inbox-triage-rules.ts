/**
 * S4.1 (#313) — yerel, kural tabanlı gelen posta sınıflaması.
 * Yalnız META kullanılır: konu satırı, gönderen alan adı ve ek uzantıları. Gövde, özet (snippet) veya ek içeriği
 * okunmaz; hiçbir veri harici bir modele gönderilmez. Sonuç yalnız bir sınıf anahtarıdır.
 */
export const TRIAGE_CATEGORIES = ["invoice", "meeting", "membership", "donation", "question", "other"] as const;
export type TriageCategory = (typeof TRIAGE_CATEGORIES)[number];

/** Sekreterin taslak önerdiği sınıflar ve öneri türü. */
export const TRIAGE_SUGGESTION: Partial<Record<TriageCategory, "replyDraft" | "taskDraft">> = {
  question: "replyDraft",
  membership: "replyDraft",
  meeting: "taskDraft",
  donation: "taskDraft",
};

export type TriageMeta = { subject: string; fromAddress?: string | null; attachmentExtensions?: readonly string[] };

/** Unicode kelime sınırı (JS `\b` yalnız ASCII; "toplantı", "bağış" gibi kelimelerde çalışmaz). */
const words = (...alternatives: string[]) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join("|")})(?![\\p{L}\\p{N}])`, "iu");

// Sıra önemlidir: ilk eşleşen sınıf kazanır (fatura en belirgin sinyal).
const RULES: readonly [TriageCategory, RegExp][] = [
  ["invoice", words("rechnung(en)?", "re-nr", "faturas?[ıi]?", "invoice", "zahlungserinnerung", "mahnung", "gutschrift", "xrechnung", "zugferd")],
  ["meeting", words("einladung", "sitzung", "termin", "toplant[ıi]s?[ıi]?", "davet(iye)?", "meeting", "invitation", "vorstandssitzung", "mitgliederversammlung", "genel kurul")],
  ["membership", words("mitglied(schaft)?", "beitritt", "austritt", "k[üu]ndigung", "[üu]yeli[kğ]i?", "aidat", "membership", "mitgliedsbeitrag")],
  ["donation", words("spende", "spendenquittung", "zuwendungsbest[äa]tigung", "ba[ğg][ıi][şs]", "donation")],
  ["question", words("frage", "anfrage", "soru", "bilgi talebi", "question", "inquiry", "bitte um", "rica")],
];
const ENDS_WITH_QUESTION = /\?\s*$/;
const RECEIPT = words("beleg", "quittung", "makbuz", "receipt");

/** Denetlenebilir, saf sınıflayıcı. Aynı girdi her zaman aynı sonucu verir. */
export function classifyInboxMeta(meta: TriageMeta): TriageCategory {
  const subject = meta.subject.normalize("NFC").slice(0, 300);
  const attachments = meta.attachmentExtensions ?? [];
  if (attachments.includes("xml")) return "invoice";
  for (const [category, pattern] of RULES) if (pattern.test(subject)) return category;
  if (attachments.includes("pdf") && RECEIPT.test(subject)) return "invoice";
  return ENDS_WITH_QUESTION.test(subject) ? "question" : "other";
}

/** Gönderenin yalnız alan adı (kişisel kısım dışarıda kalır). */
export function senderDomain(fromAddress: string | null | undefined): string | null {
  const domain = fromAddress?.split("@")[1]?.trim().toLowerCase();
  return domain && /^[a-z0-9.-]{1,253}$/.test(domain) ? domain : null;
}
