import { DATEV_DEBTOR_COLUMNS } from "../constants";

export type DatevGuardian = {
  debtorNumber: number;
  salutation: string | null;
  firstName: string;
  lastName: string;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  email: string | null;
  phone: string | null;
};

/** Windows-1252'de olmayan Türkçe harfler (DATEV ASCII içe aktarımı ANSI bekler). */
const TRANSLITERATE: Record<string, string> = { ş: "s", Ş: "S", ğ: "g", Ğ: "G", ı: "i", İ: "I" };
const CP1252_EXTRA: Record<string, number> = { "€": 0x80, "„": 0x84, "“": 0x93, "”": 0x94, "–": 0x96, "—": 0x97 };

/** Metni Windows-1252 baytlarına çevirir; karşılığı olmayan karakter "?" olur. */
export function encodeCp1252(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const raw of text) {
    for (const char of TRANSLITERATE[raw] ?? raw) {
      const code = char.charCodeAt(0);
      if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) bytes.push(code);
      else bytes.push(CP1252_EXTRA[char] ?? 0x3f);
    }
  }
  return Uint8Array.from(bytes);
}

/** DATEV metin alanı: çift tırnak içinde, içteki tırnak ikilenir, alan uzunluğu kırpılır. */
function quoted(value: string | null | undefined, max: number): string {
  const text = (value ?? "").replace(/[\r\n;]+/g, " ").slice(0, max);
  return `"${text.replace(/"/g, '""')}"`;
}

function timestamp(now: Date): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}${pad(now.getUTCMilliseconds(), 3)}`;
}

/**
 * DATEV-Format "Debitoren/Kreditoren" (Datenkategorie 16, Formatversion 5), EXTF başlığıyla.
 * Yalnızca ilk 33 Stammdaten sütunu (hesap, ad, adres, iletişim) doldurulur; banka ve diğer
 * sütunlar DATEV'de elle tamamlanabilir. Adressattyp "1" = natürliche Person.
 */
export function buildDatevDebtorsCsv(
  guardians: DatevGuardian[],
  options: { consultantNo: string; clientNo: string; fiscalYearStart: string; now?: Date },
): Uint8Array {
  const header = [
    '"EXTF"', "700", "16", '"Debitoren/Kreditoren"', "5", timestamp(options.now ?? new Date()), "", '"RE"', '""', '""',
    options.consultantNo, options.clientNo, options.fiscalYearStart, "4",
  ].join(";");
  const columns = DATEV_DEBTOR_COLUMNS.map((name) => `"${name}"`).join(";");
  const rows = guardians.map((guardian) => {
    const cells: string[] = new Array(DATEV_DEBTOR_COLUMNS.length).fill("");
    cells[0] = String(guardian.debtorNumber); // Konto
    cells[3] = quoted(guardian.lastName, 30); // Name (Adressattyp natürl. Person)
    cells[4] = quoted(guardian.firstName, 30); // Vorname (Adressattyp natürl. Person)
    cells[6] = "1"; // Adressattyp: natürliche Person
    cells[7] = quoted(`${guardian.lastName} ${guardian.firstName}`, 15); // Kurzbezeichnung
    cells[10] = quoted(guardian.salutation, 30); // Anrede
    cells[14] = quoted("STR", 3); // Adressart: Straße
    cells[15] = quoted([guardian.street, guardian.houseNumber].filter(Boolean).join(" "), 36); // Straße
    cells[17] = quoted(guardian.postalCode, 10); // Postleitzahl
    cells[18] = quoted(guardian.city, 30); // Ort
    cells[19] = quoted(guardian.country, 2); // Land
    cells[28] = quoted(guardian.phone, 60); // Telefon
    cells[32] = quoted(guardian.email, 60); // E-Mail
    return cells.join(";");
  });
  return encodeCp1252([header, columns, ...rows].join("\r\n") + "\r\n");
}
