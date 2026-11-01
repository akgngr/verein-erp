/**
 * ACC-4 banka ekstresi ayrıştırıcıları (saf, bağımlılıksız): CAMT.053 (XML), MT940 ve
 * Alman bankalarının CSV dışa aktarımları (başlık satırı otomatik bulunur). Tutar cent, işaretli:
 * + gelen, − giden. Tarihler "YYYY-MM-DD".
 */
export type ParsedTransaction = {
  bookingDate: string;
  valueDate: string | null;
  amountCents: number;
  currency: string;
  counterpartyName: string | null;
  counterpartyIban: string | null;
  purpose: string;
  reference: string | null;
};

export type BankFormat = "CAMT053" | "MT940" | "CSV";

export class BankParseError extends Error {}

export function detectFormat(text: string): BankFormat {
  const head = text.slice(0, 2000);
  if (/<\?xml|<Document[\s>]|camt\.05[234]/i.test(head)) return "CAMT053";
  if (/^:20:|\n:20:|:60F:/m.test(head)) return "MT940";
  return "CSV";
}

export function parseStatement(text: string, format: BankFormat = detectFormat(text)): ParsedTransaction[] {
  if (format === "CAMT053") return parseCamt053(text);
  if (format === "MT940") return parseMt940(text);
  return parseCsv(text);
}

// ---------------------------------------------------------------- helpers

const decodeXml = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

/** İlk eşleşen etiketin içeriği; yol "A/B/C" (namespace öneki yok sayılır). */
export function xmlPath(xml: string, path: string): string | null {
  let scope = xml;
  for (const tag of path.split("/")) {
    const match = new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${tag}>`).exec(scope);
    if (!match) return null;
    scope = match[1];
  }
  return decodeXml(scope);
}

export function xmlAll(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, "g"))].map((match) => match[1]);
}

/** "1.234,56" / "1234.56" / "-12,3" → cent (işaretli). */
export function parseAmount(raw: string): number {
  let value = raw.replace(/\s|€|EUR/g, "");
  const negative = /^-|-$/.test(value) || /^\(.*\)$/.test(value);
  value = value.replace(/[-+()]/g, "");
  if (/,\d{1,2}$/.test(value)) value = value.replace(/\./g, "").replace(",", ".");
  else value = value.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new BankParseError("accounting.bank.errors.parse");
  const [euros, cents = ""] = value.split(".");
  const total = Number(euros) * 100 + Number(cents.padEnd(2, "0"));
  return negative ? -total : total;
}

/** "31.10.2026" / "31.10.26" / "2026-10-31" → ISO. */
export function parseDate(raw: string): string {
  const value = raw.trim();
  let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(value);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  throw new BankParseError("accounting.bank.errors.parse");
}

const clean = (value: string | null | undefined) => {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text.length ? text : null;
};

// ---------------------------------------------------------------- CAMT.053

export function parseCamt053(xml: string): ParsedTransaction[] {
  const statementCurrency = /<(?:\w+:)?Acct>[\s\S]*?<(?:\w+:)?Ccy>([A-Z]{3})</.exec(xml)?.[1] ?? "EUR";
  const entries = xmlAll(xml, "Ntry");
  if (!entries.length && !/<(?:\w+:)?Stmt[\s>]/.test(xml)) throw new BankParseError("accounting.bank.errors.parse");
  return entries.map((entry) => {
    const amountMatch = /<(?:\w+:)?Amt(?:\s+Ccy="([A-Z]{3})")?[^>]*>([\d.]+)</.exec(entry);
    if (!amountMatch) throw new BankParseError("accounting.bank.errors.parse");
    const credit = xmlPath(entry, "CdtDbtInd") === "CRDT";
    const cents = parseAmount(amountMatch[2]);
    const details = xmlAll(entry, "TxDtls")[0] ?? entry;
    const party = credit ? "Dbtr" : "Cdtr";
    const name = xmlPath(details, `RltdPties/${party}/Nm`) ?? xmlPath(details, `RltdPties/${party}/Pty/Nm`);
    const iban = xmlPath(details, `RltdPties/${party}Acct/Id/IBAN`);
    const purpose = xmlAll(details, "Ustrd").map(decodeXml).join(" ") || xmlPath(entry, "AddtlNtryInf") || "";
    const date = xmlPath(entry, "BookgDt/Dt") ?? xmlPath(entry, "BookgDt/DtTm")?.slice(0, 10);
    if (!date) throw new BankParseError("accounting.bank.errors.parse");
    const endToEnd = xmlPath(details, "Refs/EndToEndId");
    return {
      bookingDate: parseDate(date),
      valueDate: (xmlPath(entry, "ValDt/Dt") ?? xmlPath(entry, "ValDt/DtTm")?.slice(0, 10)) ?? null,
      amountCents: credit ? cents : -cents,
      currency: amountMatch[1] ?? statementCurrency,
      counterpartyName: clean(name),
      counterpartyIban: clean(iban)?.replace(/\s/g, "") ?? null,
      purpose: clean(purpose) ?? "",
      reference: endToEnd && endToEnd !== "NOTPROVIDED" ? endToEnd : clean(xmlPath(entry, "AcctSvcrRef")),
    };
  });
}

// ---------------------------------------------------------------- MT940

export function parseMt940(text: string): ParsedTransaction[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const currency = /:60[FM]:[CD]\d{6}([A-Z]{3})/.exec(normalized)?.[1] ?? "EUR";
  // Alanları ":xx:" başlıklarına göre ayır; devam satırları önceki alana eklenir.
  const fields: Array<{ tag: string; value: string }> = [];
  for (const line of normalized.split("\n")) {
    const match = /^:(\d{2}[A-Z]?):(.*)$/.exec(line);
    if (match) fields.push({ tag: match[1], value: match[2] });
    else if (fields.length && line !== "-") fields[fields.length - 1].value += `\n${line}`;
  }
  const result: ParsedTransaction[] = [];
  for (let index = 0; index < fields.length; index++) {
    if (fields[index].tag !== "61") continue;
    const line = fields[index].value.split("\n")[0];
    const match = /^(\d{2})(\d{2})(\d{2})(\d{4})?(R?[CD])[A-Z]?([\d,]+)N?(\w{3})?([^/]*)(?:\/\/(.*))?/.exec(line);
    if (!match) throw new BankParseError("accounting.bank.errors.parse");
    const [, yy, mm, dd, entry, mark, amount, , customerRef] = match;
    const debit = mark === "D" || mark === "RC";
    const cents = parseAmount(amount);
    const info = fields[index + 1]?.tag === "86" ? fields[index + 1].value.replace(/\n/g, "") : "";
    const sub = (code: string) => [...info.matchAll(/\?(\d{2})([^?]*)/g)].filter((part) => part[1] === code).map((part) => part[2]).join("");
    const structured = info.includes("?");
    const purposeParts = structured ? [...info.matchAll(/\?(\d{2})([^?]*)/g)].filter((part) => (Number(part[1]) >= 20 && Number(part[1]) <= 29) || (Number(part[1]) >= 60 && Number(part[1]) <= 63)).map((part) => part[2]) : [info];
    const bookingDate = entry ? `20${yy}-${entry.slice(0, 2)}-${entry.slice(2)}` : `20${yy}-${mm}-${dd}`;
    result.push({
      bookingDate,
      valueDate: `20${yy}-${mm}-${dd}`,
      amountCents: debit ? -cents : cents,
      currency,
      counterpartyName: structured ? clean(sub("32") + sub("33")) : null,
      counterpartyIban: structured ? clean(sub("31"))?.replace(/\s/g, "") ?? null : null,
      purpose: clean(sepaPurpose(purposeParts.join(""))) ?? "",
      reference: (clean(customerRef) && customerRef !== "NONREF" ? clean(customerRef) : null) ?? sepaTag(purposeParts.join(""), "EREF"),
    });
  }
  return result;
}

const SEPA_TAGS = "EREF|KREF|MREF|CRED|DEBT|SVWZ|ABWA|ABWE|IBAN|BIC|COAM|OAMT";

/** SEPA etiketli metinden (EREF+…SVWZ+…) bir etiketin değeri. */
function sepaTag(text: string, tag: string): string | null {
  const match = new RegExp(`${tag}\\+(.*?)(?=(?:${SEPA_TAGS})\\+|$)`).exec(text);
  const value = match?.[1]?.trim();
  return value && value !== "NOTPROVIDED" ? value : null;
}

/** Açıklama: SVWZ varsa yalnızca o; yoksa etiketler temizlenmiş metin. */
function sepaPurpose(text: string): string {
  const svwz = sepaTag(text, "SVWZ");
  if (svwz) return svwz;
  return text.replace(new RegExp(`(?:${SEPA_TAGS})\\+\\S*`, "g"), " ");
}

// ---------------------------------------------------------------- CSV

/** Tırnaklı alanları destekleyen basit CSV satır ayırıcı. */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index++;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

const COLUMN_ALIASES = {
  date: ["buchungstag", "buchungsdatum", "datum", "booking date"],
  valueDate: ["valutadatum", "valuta", "wertstellung", "wertstellungsdatum"],
  amount: ["betrag (€)", "betrag (eur)", "betrag", "umsatz", "amount"],
  currency: ["waehrung", "währung", "currency"],
  name: ["beguenstigter/zahlungspflichtiger", "begünstigter/zahlungspflichtiger", "name zahlungsbeteiligter", "zahlungsempfänger*in", "zahlungspflichtige*r", "auftraggeber / begünstigter", "auftraggeber/begünstigter", "empfänger", "auftraggeber", "name", "payee"],
  iban: ["kontonummer/iban", "iban zahlungsbeteiligter", "iban", "kontonummer"],
  purpose: ["verwendungszweck", "buchungstext", "purpose", "reference"],
  reference: ["end-to-end-referenz", "kundenreferenz (end-to-end)", "kundenreferenz", "mandatsreferenz"],
} as const;

export function parseCsv(text: string): ParsedTransaction[] {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n").filter((line) => line.trim().length);
  const delimiter = (lines.slice(0, 20).join("\n").match(/;/g)?.length ?? 0) >= (lines.slice(0, 20).join("\n").match(/,/g)?.length ?? 0) / 2 ? ";" : ",";
  // Başlık satırı: hem tarih hem tutar sütunu içeren ilk satır (DKB/ING ön satırları atlanır).
  const headerIndex = lines.findIndex((line) => {
    const cells = splitCsvLine(line, delimiter).map((cell) => cell.toLowerCase());
    return cells.some((cell) => COLUMN_ALIASES.date.some((alias) => cell === alias)) && cells.some((cell) => COLUMN_ALIASES.amount.some((alias) => cell === alias || cell.startsWith(alias)));
  });
  if (headerIndex < 0) throw new BankParseError("accounting.bank.errors.parse");
  const header = splitCsvLine(lines[headerIndex], delimiter).map((cell) => cell.toLowerCase());
  const column = (key: keyof typeof COLUMN_ALIASES) => {
    for (const alias of COLUMN_ALIASES[key]) {
      const index = header.findIndex((cell) => cell === alias);
      if (index >= 0) return index;
    }
    for (const alias of COLUMN_ALIASES[key]) {
      const index = header.findIndex((cell) => cell.startsWith(alias));
      if (index >= 0) return index;
    }
    return -1;
  };
  const idx = { date: column("date"), valueDate: column("valueDate"), amount: column("amount"), currency: column("currency"), name: column("name"), iban: column("iban"), purpose: column("purpose"), reference: column("reference") };
  const cell = (cells: string[], index: number) => (index >= 0 ? cells[index] ?? "" : "");
  const result: ParsedTransaction[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    const cells = splitCsvLine(line, delimiter);
    const date = cell(cells, idx.date);
    const amount = cell(cells, idx.amount);
    if (!date || !amount || !/\d/.test(date)) continue;
    let bookingDate: string;
    try {
      bookingDate = parseDate(date);
    } catch {
      continue; // alt bilgi / toplam satırları
    }
    const valueRaw = cell(cells, idx.valueDate);
    result.push({
      bookingDate,
      valueDate: valueRaw ? (() => { try { return parseDate(valueRaw); } catch { return null; } })() : null,
      amountCents: parseAmount(amount),
      currency: clean(cell(cells, idx.currency)) ?? "EUR",
      counterpartyName: clean(cell(cells, idx.name)),
      counterpartyIban: clean(cell(cells, idx.iban))?.replace(/\s/g, "") ?? null,
      purpose: clean(cell(cells, idx.purpose)) ?? "",
      reference: clean(cell(cells, idx.reference)),
    });
  }
  return result;
}

/** Mükerrer içe aktarımı önleyen doğal anahtar (hash'lenmeden önce). */
export function transactionKey(accountId: string, tx: ParsedTransaction): string {
  return [accountId, tx.bookingDate, tx.amountCents, tx.counterpartyIban ?? "", tx.reference ?? "", tx.purpose].join("|");
}
