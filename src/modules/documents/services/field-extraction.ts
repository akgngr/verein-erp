/**
 * Evrak metninden form önerileri (docs/specs/DOCUMENTS_AI.md, EV-1). Saf, kural tabanlı; AI gerekmez.
 * Almanca ve Türkçe kalıplar. Öneriler yalnızca öneridir: kullanıcı seçer, form doğrulaması geçerlidir.
 */
export type DocumentSuggestions = {
  documentDate?: string;
  dueDate?: string;
  referenceNumber?: string;
  counterparty?: string;
  subject?: string;
  amountCents?: number;
  iban?: string;
  kind?: "invoice" | "reminder" | "notice" | "letter";
};

const MONTHS: Record<string, number> = {
  januar: 1, jänner: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
  ocak: 1, şubat: 2, mart: 3, nisan: 4, mayıs: 5, haziran: 6, temmuz: 7, ağustos: 8, eylül: 9, ekim: 10, kasım: 11, aralık: 12,
};
const MONTH_NAMES = Object.keys(MONTHS).join("|");
const DATE = new RegExp(`(\\d{1,2})[./](\\d{1,2})[./](\\d{2,4})|(\\d{4})-(\\d{2})-(\\d{2})|(\\d{1,2})\\.?\\s+(${MONTH_NAMES})\\s+(\\d{4})`, "giu");

function toIso(match: RegExpMatchArray): string | null {
  let day: number, month: number, year: number;
  if (match[1]) [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if (match[4]) [year, month, day] = [Number(match[4]), Number(match[5]), Number(match[6])];
  else [day, month, year] = [Number(match[7]), MONTHS[match[8].toLocaleLowerCase("tr")] ?? 0, Number(match[9])];
  if (year < 100) year += 2000;
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1) return null;
  return date.toISOString().slice(0, 10);
}

function datesIn(text: string): Array<{ iso: string; index: number }> {
  return [...text.matchAll(DATE)].flatMap((match) => {
    const iso = toIso(match);
    return iso ? [{ iso, index: match.index ?? 0 }] : [];
  });
}

/** "1.234,56" / "1234,56" / "1,234.56" / "1234.56" → cent. */
export function parseMoney(raw: string): number | null {
  const value = raw.replace(/\s|€|EUR|TL|₺/gi, "");
  if (!/^\d[\d.,]*$/.test(value)) return null;
  const lastComma = value.lastIndexOf(","), lastDot = value.lastIndexOf(".");
  const decimalAt = Math.max(lastComma, lastDot);
  const hasDecimals = decimalAt > -1 && value.length - decimalAt - 1 === 2;
  const integer = (hasDecimals ? value.slice(0, decimalAt) : value).replace(/[.,]/g, "");
  const cents = hasDecimals ? value.slice(decimalAt + 1) : "00";
  const result = Number(integer) * 100 + Number(cents);
  return Number.isSafeInteger(result) ? result : null;
}

const AMOUNT = /(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})|\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})\s*(?:€|EUR|Euro|TL|₺)?/gi;

function isValidIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const value = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

const LEGAL_FORM = /\b(GmbH|gGmbH|mbH|AG|KG|OHG|UG|GbR|e\.\s?V\.|eG|Stadt|Amt|Finanzamt|Gemeinde|Landkreis|Ministerium|Bezirksamt|Sparkasse|Bank|Versicherung|Stadtwerke|Ltd\.?|A\.Ş\.|Ltd\. Şti\.|Belediye|Müdürlüğü|Başkanlığı|Bakanlığı|Derneği|Vakfı)\b/u;

const lines = (text: string) => text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);

/** Metinden öneriler; bulunamayan alan önerilmez. */
export function extractDocumentFields(text: string): DocumentSuggestions {
  const result: DocumentSuggestions = {};
  const all = lines(text);
  if (!all.length) return result;
  const joined = all.join("\n");

  // Tarihler: anahtar sözcüklü satırlar önce.
  const dueLine = all.find((line) => /(bis\s+(?:zum|spätestens)|spätestens|fällig|fälligkeit|zahlbar\s+bis|frist|son\s+ödeme|vade|tarihine\s+kadar|en\s+geç)/iu.test(line) && datesIn(line).length);
  if (dueLine) result.dueDate = datesIn(dueLine).at(-1)!.iso;
  const dateLine = all.find((line) => /(datum|tarih|rechnungsdatum|belegdatum|ausstellungsdatum|\bvom\b|düzenleme)/iu.test(line) && line !== dueLine && datesIn(line).length);
  const firstDate = dateLine ? datesIn(dateLine)[0].iso : datesIn(joined).map((d) => d.iso).find((iso) => iso !== result.dueDate);
  if (firstDate) result.documentDate = firstDate;

  // Referans numarası.
  const reference = /(?:rechnungs?[\s-]?(?:nr|nummer)\.?|rechnung\s+nr\.?|aktenzeichen|az\.|gesch[äa]ftszeichen|unser\s+zeichen|ihr\s+zeichen|kunden[\s-]?nr\.?|kundennummer|vertragsnummer|bescheid[\s-]?nr\.?|sayı|evrak\s+no|fatura\s+no|referans)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-/.]{2,40})/iu.exec(joined);
  if (reference) result.referenceNumber = reference[1].replace(/[.,]$/, "");

  // Konu: "Betreff:" / "Konu:" satırı; yoksa belge türünü adlandıran satır.
  const subjectLine = all.find((line) => /^(betreff|betr\.|konu)\s*[:.]?\s+/iu.test(line));
  const titled = all.find((line) => /^(rechnung|mahnung|zahlungserinnerung|bescheid|kündigung|einladung|fatura|ihtar|tebligat|davet)\b/iu.test(line) && line.length <= 120);
  const subject = subjectLine?.replace(/^(betreff|betr\.|konu)\s*[:.]?\s+/iu, "") ?? titled;
  if (subject) result.subject = subject.slice(0, 200);

  // Gönderen: ilk satırlarda tüzel kişi biçimi; yoksa ilk anlamlı satır.
  const head = all.slice(0, 8);
  const sender = head.find((line) => LEGAL_FORM.test(line) && line.length <= 80) ?? head.find((line) => line.length >= 3 && line.length <= 60 && !datesIn(line).length && !/^(seite|sayfa|page)\b/iu.test(line));
  if (sender) result.counterparty = sender.replace(/\s*[|·•].*$/, "").slice(0, 150);

  // Tutar: anahtar sözcüklü satır; yoksa para birimi işaretli en büyük tutar.
  const amountLine = all.find((line) => /(gesamtbetrag|rechnungsbetrag|endbetrag|zu\s+zahlen|zahlbetrag|summe|betrag|toplam|tutar|ödenecek)/iu.test(line) && AMOUNT.test(line));
  AMOUNT.lastIndex = 0;
  // Tarihler tutar sanılmasın diye satırdan çıkarılır; para birimi işaretli tutar önceliklidir.
  const amountsIn = (line: string) =>
    [...line.replace(DATE, " ").matchAll(AMOUNT)].map((match) => ({ cents: parseMoney(match[1]), marked: /€|EUR|Euro|TL|₺/i.test(match[0]) }))
      .filter((item): item is { cents: number; marked: boolean } => item.cents !== null && item.cents > 0);
  if (amountLine) {
    const found = amountsIn(amountLine);
    const pick = found.find((item) => item.marked) ?? found[0];
    if (pick) result.amountCents = pick.cents;
  } else {
    const marked = all.filter((line) => /€|EUR|Euro|TL|₺/i.test(line)).flatMap(amountsIn).filter((item) => item.marked);
    if (marked.length) result.amountCents = Math.max(...marked.map((item) => item.cents));
  }

  // IBAN (doğrulanmış).
  for (const match of joined.matchAll(/\b([A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?)\b/g)) {
    const iban = match[1].replace(/\s/g, "");
    if (isValidIban(iban)) {
      result.iban = iban;
      break;
    }
  }

  // Tür.
  if (/\b(mahnung|zahlungserinnerung|ihtar)/iu.test(joined)) result.kind = "reminder";
  else if (/\b(rechnung|invoice|fatura)\b/iu.test(joined) && result.amountCents) result.kind = "invoice";
  else if (/\b(bescheid|tebligat|verfügung)\b/iu.test(joined)) result.kind = "notice";
  else result.kind = "letter";
  return result;
}
