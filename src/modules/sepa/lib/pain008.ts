/**
 * SEPA-Lastschrift dosyası: pain.008.001.08 (DK-Spezifikation, CORE, RCUR). Bankaya yüklenir. Bağımlılıksız ve saf.
 * KARAR: 2016'dan beri ilk tahsilatta FRST zorunlu değil; tüm kalemler RCUR gönderilir.
 */
export type DebitTransaction = { endToEndId: string; amountCents: number; mandateId: string; mandateDate: string; debtorName: string; debtorIban: string; debtorBic: string | null; remittance: string };
export type DebitBatch = { messageId: string; createdAt: Date; collectionDate: string; creditor: { name: string; iban: string; bic: string | null; creditorId: string }; transactions: DebitTransaction[] };

/** SEPA karakter kümesi: ä/ö/ü/ß ve Türkçe ı/İ/ğ/ş/ç dönüştürülür, izin verilmeyenler boşluk olur. */
export function sepaText(value: string, max: number): string {
  return value
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/ı/g, "i").replace(/İ/g, "I").replace(/Ğ/g, "G").replace(/ğ/g, "g").replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ç/g, "C").replace(/ç/g, "c")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9/?:().,'+\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** IBAN mod-97 (ISO 13616). */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  let rest = 0;
  for (const char of iban.slice(4) + iban.slice(0, 4)) {
    for (const digit of /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char) rest = (rest * 10 + Number(digit)) % 97;
  }
  return rest === 1;
}

/** Gläubiger-ID biçimi (ör. DE98ZZZ09999999999) ve ISO 7064 mod-97 kontrolü (iş kodu hariç). */
export function isValidCreditorId(raw: string): boolean {
  const id = raw.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z0-9]{1,28}$/.test(id)) return false;
  const check = id.slice(7) + id.slice(0, 4);
  let rest = 0;
  for (const char of check) {
    for (const digit of /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char) rest = (rest * 10 + Number(digit)) % 97;
  }
  return rest === 1;
}

const amount = (cents: number) => (cents / 100).toFixed(2);
const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const iban = (value: string) => value.replace(/\s/g, "").toUpperCase();
const agent = (bic: string | null) => `<FinInstnId>${bic ? `<BICFI>${esc(bic.toUpperCase())}</BICFI>` : "<Othr><Id>NOTPROVIDED</Id></Othr>"}</FinInstnId>`;
/**
 * Mandatsreferenz / EndToEndId / MsgId (RestrictedIdentificationSEPA1):
 * boşluk yok, başta/sonda `/` ve çift `//` yasak (XSD pattern).
 */
export function sepaRef(value: string): string {
  const cleaned = sepaText(value, 35)
    .replace(/\s+/g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 35)
    .replace(/\/+$/g, "");
  return cleaned || "NOTPROVIDED";
}

export function buildPain008(batch: DebitBatch): string {
  const creditorName = sepaText(batch.creditor.name, 70);
  if (!creditorName) throw new Error("sepa.errors.invalidName");
  const total = batch.transactions.reduce((sum, tx) => sum + tx.amountCents, 0);
  const count = batch.transactions.length;
  const transactions = batch.transactions
    .map((tx) => {
      const debtorName = sepaText(tx.debtorName, 70);
      if (!debtorName) throw new Error("sepa.errors.invalidName");
      const remittance = sepaText(tx.remittance, 140) || "SEPA Lastschrift"; // i18n-ignore: Verwendungszweck
      return (
        `<DrctDbtTxInf><PmtId><EndToEndId>${esc(sepaRef(tx.endToEndId))}</EndToEndId></PmtId><InstdAmt Ccy="EUR">${amount(tx.amountCents)}</InstdAmt>` +
        `<DrctDbtTx><MndtRltdInf><MndtId>${esc(sepaRef(tx.mandateId))}</MndtId><DtOfSgntr>${tx.mandateDate}</DtOfSgntr></MndtRltdInf></DrctDbtTx>` +
        `<DbtrAgt>${agent(tx.debtorBic)}</DbtrAgt><Dbtr><Nm>${esc(debtorName)}</Nm></Dbtr><DbtrAcct><Id><IBAN>${iban(tx.debtorIban)}</IBAN></Id></DbtrAcct>` +
        `<RmtInf><Ustrd>${esc(remittance)}</Ustrd></RmtInf></DrctDbtTxInf>`
      );
    })
    .join("");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    "<CstmrDrctDbtInitn>",
    `<GrpHdr><MsgId>${esc(sepaRef(batch.messageId))}</MsgId><CreDtTm>${batch.createdAt.toISOString().slice(0, 19)}</CreDtTm><NbOfTxs>${count}</NbOfTxs><CtrlSum>${amount(total)}</CtrlSum><InitgPty><Nm>${esc(creditorName)}</Nm></InitgPty></GrpHdr>`,
    `<PmtInf><PmtInfId>${esc(sepaRef(batch.messageId))}</PmtInfId><PmtMtd>DD</PmtMtd><BtchBookg>true</BtchBookg><NbOfTxs>${count}</NbOfTxs><CtrlSum>${amount(total)}</CtrlSum>` +
      `<PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><LclInstrm><Cd>CORE</Cd></LclInstrm><SeqTp>RCUR</SeqTp></PmtTpInf><ReqdColltnDt>${batch.collectionDate}</ReqdColltnDt>` +
      `<Cdtr><Nm>${esc(creditorName)}</Nm></Cdtr><CdtrAcct><Id><IBAN>${iban(batch.creditor.iban)}</IBAN></Id></CdtrAcct><CdtrAgt>${agent(batch.creditor.bic)}</CdtrAgt><ChrgBr>SLEV</ChrgBr>` +
      `<CdtrSchmeId><Id><PrvtId><Othr><Id>${esc(batch.creditor.creditorId.replace(/\s/g, "").toUpperCase())}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>${transactions}</PmtInf>`,
    "</CstmrDrctDbtInitn>",
    "</Document>",
  ].join("\n");
}

/** Gregorian Paskalya Pazarı (UTC) — TARGET2 Karfreitag / Ostermontag hesabı için. */
export function easterSundayUtc(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** TARGET2 resmi tatilleri: 1 Ocak, Karfreitag, Ostermontag, 1 Mayıs, 25 ve 26 Aralık. */
export function isTarget2Holiday(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const year = Number(isoDate.slice(0, 4));
  const mmdd = isoDate.slice(5);
  if (mmdd === "01-01" || mmdd === "05-01" || mmdd === "12-25" || mmdd === "12-26") return true;
  const easter = easterSundayUtc(year);
  const goodFriday = new Date(easter.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
  const easterMonday = new Date(easter.getTime() + 1 * 86_400_000).toISOString().slice(0, 10);
  return isoDate === goodFriday || isoDate === easterMonday;
}

/** TARGET2 banka iş günü mü (Pzt–Cum ve TARGET2 tatili değil)? */
export function isTarget2BankingDay(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return false;
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !isTarget2Holiday(isoDate);
}

/** Europe/Berlin saat diliminde bugünün ISO tarihi (YYYY-MM-DD). */
export function berlinTodayIso(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** En erken tahsilat günü: verilen günden +n TARGET2 banka iş günü (hafta sonu + TARGET2 tatilleri atlanır). */
export function earliestCollectionDate(from: Date, businessDays = 2): string {
  const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let added = 0;
  while (added < businessDays) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (isTarget2BankingDay(date.toISOString().slice(0, 10))) added += 1;
  }
  return date.toISOString().slice(0, 10);
}

/** SEPA CORE tahsilat tarihi geçerli mi: Europe/Berlin D+1 TARGET2 iş günü veya sonrası ve kendisi TARGET2 iş günü. */
export function isValidCollectionDate(isoDate: string, now: Date = new Date()): boolean {
  if (!isTarget2BankingDay(isoDate)) return false;
  const todayBerlin = new Date(`${berlinTodayIso(now)}T00:00:00Z`);
  const minDate = earliestCollectionDate(todayBerlin, 1);
  return isoDate >= minDate;
}
