import "server-only";

import ExcelJS from "exceljs";
import type { MembershipType } from "@prisma/client";

import { IMPORT_MAX_ROWS, IMPORT_STATUS_ALIASES, IMPORT_TYPE_ALIASES } from "../constants";
import { memberCreateSchema } from "../schemas/member";
import type { ImportRowError } from "../types";

/**
 * Excel içe aktarma ayrıştırıcı (Faz 3 eklemeleri — iş emri § 8 uyarlandı).
 *
 * KARAR: Ayrıştırıcı DB'ye BAĞLANMAZ (saf dosya→satır dönüştürme); DB mükerrer
 * kontrolü handler'da yapılır. Alan doğrulaması memberCreateSchema ile yapılır —
 * böylece formdaki kurallar ve Türkçe mesajlar birebir aynıdır. kimlikNo
 * içe aktarılmaz (KVKK — iş emrinin ulusal kimlik yasağı korunur).
 */

/** message bir çeviri anahtarıdır; values interpolasyon değerleridir. */
export class ImportParseError extends Error {
  constructor(message: string, public values?: Record<string, string | number>) {
    super(message);
  }
}

/** Satır mesajları için çevirmen; varsayılan anahtarı aynen döndürür (betik/test). */
export type ImportTranslate = (key: string, values?: Record<string, string | number>) => string;

/** Başlık/hücre normalizasyonu: TR büyük İ/I düzeltmesi + ascii-fold + tek boşluk. */
function normalizeValue(value: string): string {
  return value
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

/** Excel başlığı → alan adı (anahtarlar normalizeValue ile eşleşir). */
const HEADER_MAP: Record<string, string> = {
  "ad": "firstName",
  "soyad": "lastName",
  "e-posta": "email",
  "e posta": "email",
  "eposta": "email",
  "telefon": "phone",
  "strasse": "street",
  "sokak": "street",
  "kapi no": "houseNumber",
  "posta kodu": "postalCode",
  "plz": "postalCode",
  "sehir": "city",
  "ort": "city",
  "eyalet": "state",
  "bundesland": "state",
  "ulke": "country",
  "dogum tarihi": "birthDate",
  "uyelik turu": "type",
  "uyelik tur": "type",
  "uyelik baslangic tarihi": "joinDate",
  "katilim": "joinDate",
  "durum": "status",
  "notlar": "notes",
};

const REQUIRED_HEADERS = ["firstName", "lastName", "type", "joinDate"] as const;

function cellToText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result !== null && value.result !== undefined) {
      return String(value.result);
    }
    if (value instanceof Date) return value.toISOString();
    return "";
  }
  return String(value);
}

/** Gerçek tarih hücresi veya gg.aa.yyyy / yyyy-aa-gg metni → YYYY-MM-DD. */
function cellToIsoDate(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  const text = cellToText(value).trim();
  const dot = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
  if (dot) {
    return `${dot[3]}-${dot[2].padStart(2, "0")}-${dot[1].padStart(2, "0")}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return text;
  return null;
}

export type ParsedImportRow = {
  /** Excel satır numarası (1 tabanlı; başlık satırı 1). */
  row: number;
  data: {
    type: MembershipType;
    status: "ACTIVE" | "PASSIVE" | "RESIGNED";
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    street: string | null;
    houseNumber: string | null;
    postalCode: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    birthDate: string | null;
    joinDate: string;
    notes: string | null;
  };
};

export type ParsedImport = {
  total: number;
  rows: ParsedImportRow[];
  errors: ImportRowError[];
};

export async function parseImportWorkbook(
  buffer: Buffer,
  translate: ImportTranslate = (key) => key,
): Promise<ParsedImport> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs kendi Buffer tipini bekler — node Buffer'ından dönüştürme gerekir.
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new ImportParseError("members.importErrors.unreadable");
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new ImportParseError("members.importErrors.noSheet");
  }

  // Başlık satırı: hücre metni → kolon indeksi.
  const columnByField = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const header = normalizeValue(cellToText(cell.value));
    const field = HEADER_MAP[header];
    if (field && !columnByField.has(field)) columnByField.set(field, colNumber);
  });

  const missing = REQUIRED_HEADERS.filter((field) => !columnByField.has(field));
  if (missing.length > 0) {
    throw new ImportParseError(
      "members.errors.importMissingColumns",
    );
  }

  const errors: ImportRowError[] = [];
  const rows: ParsedImportRow[] = [];
  let total = 0;

  // Satır sınırı: şablon başlıktan sonraki tüm satırlar.
  const maxDataRow = sheet.actualRowCount;
  if (maxDataRow - 1 > IMPORT_MAX_ROWS) {
    throw new ImportParseError("members.importErrors.tooManyRows", { max: IMPORT_MAX_ROWS });
  }

  for (let rowNumber = 2; rowNumber <= maxDataRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const cell = (field: string): ExcelJS.CellValue => {
      const col = columnByField.get(field);
      return col ? row.getCell(col).value : null;
    };

    const firstName = cellToText(cell("firstName")).trim();
    const lastName = cellToText(cell("lastName")).trim();
    const typeText = cellToText(cell("type")).trim();
    const joinDateIso = cellToIsoDate(cell("joinDate"));
    const statusText = cellToText(cell("status")).trim();

    // Tamamen boş satır: yok sayılır (toplama da girmez).
    const hasAnyContent =
      firstName !== "" ||
      lastName !== "" ||
      typeText !== "" ||
      joinDateIso !== null ||
      cellToText(cell("email")).trim() !== "" ||
      cellToText(cell("phone")).trim() !== "";
    if (!hasAnyContent) continue;

    total += 1;
    const rowMessages: string[] = [];

    const type = IMPORT_TYPE_ALIASES[normalizeValue(typeText)];
    if (!type) rowMessages.push(translate("members.importErrors.unknownType", { value: typeText }));

    let status: "ACTIVE" | "PASSIVE" | "RESIGNED" = "ACTIVE";
    if (statusText !== "") {
      const mapped = IMPORT_STATUS_ALIASES[normalizeValue(statusText)];
      if (!mapped) rowMessages.push(translate("members.importErrors.unknownStatus", { value: statusText }));
      else status = mapped;
    }

    const birthDate = cellToIsoDate(cell("birthDate"));
    if (birthDate === null && cellToText(cell("birthDate")).trim() !== "") {
      rowMessages.push(translate("members.importErrors.birthDateInvalid"));
    }
    if (!joinDateIso) rowMessages.push(translate("members.importErrors.joinDateRequired"));

    if (rowMessages.length > 0) {
      errors.push({ row: rowNumber, messages: rowMessages });
      continue;
    }

    // Alan kuralları form ile AYNI şemadan (mesajlar birebir aynı).
    const validation = memberCreateSchema.safeParse({
      type,
      status,
      firstName,
      lastName,
      kimlikNo: null,
      email: cellToText(cell("email")).trim() || null,
      phone: cellToText(cell("phone")).trim() || null,
      street: cellToText(cell("street")).trim() || null,
      houseNumber: cellToText(cell("houseNumber")).trim() || null,
      postalCode: cellToText(cell("postalCode")).trim() || null,
      city: cellToText(cell("city")).trim() || null,
      state: cellToText(cell("state")).trim() || null,
      country: cellToText(cell("country")).trim() || null,
      birthDate,
      profession: null,
      joinDate: joinDateIso,
      exitDate: null,
      exitReason: null,
      notes: cellToText(cell("notes")).trim() || null,
    });

    if (!validation.success) {
      const messages = validation.error.issues.map((issue) => translate(issue.message));
      errors.push({ row: rowNumber, messages });
      continue;
    }

    const data = validation.data;
    rows.push({
      row: rowNumber,
      data: {
        type,
        status,
        firstName: data.firstName,
        lastName: data.lastName,
        // KARAR: e-posta küçük harfe çevrilerek saklanır (form kuralı ile aynı).
        email: data.email ? data.email.toLowerCase() : null,
        phone: data.phone,
        street: data.street,
        houseNumber: data.houseNumber,
        postalCode: data.postalCode,
        city: data.city,
        state: data.state,
        country: data.country,
        birthDate: data.birthDate,
        joinDate: data.joinDate,
        notes: data.notes,
      },
    });
  }

  return { total, rows, errors };
}
