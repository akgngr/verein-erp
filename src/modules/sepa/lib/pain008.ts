/**
 * SEPA-Lastschrift dosyası: pain.008.001.08 (DK-Spezifikation, CORE, RCUR). Bankaya yüklenir. Bağımlılıksız ve saf.
 * KARAR: 2016'dan beri ilk tahsilatta FRST zorunlu değil; tüm kalemler RCUR gönderilir.
 */
export type DebitTransaction = { endToEndId: string; amountCents: number; mandateId: string; mandateDate: string; debtorName: string; debtorIban: string; debtorBic: string | null; remittance: string };
export type DebitBatch = { messageId: string; createdAt: Date; collectionDate: string; creditor: { name: string; iban: string; bic: string | null; creditorId: string }; transactions: DebitTransaction[] };

/** SEPA karakter kümesi: ä/ö/ü/ß dönüştürülür, izin verilmeyenler boşluk olur. */
export function sepaText(value: string, max: number): string {
  return value
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/ı/g, "i").replace(/İ/g, "I")
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
/** Mandatsreferenz/EndToEndId izinli karakterleri (boşluk yok). */
const ref = (value: string) => sepaText(value, 35).replace(/\s/g, "") || "NOTPROVIDED";

export function buildPain008(batch: DebitBatch): string {
  const total = batch.transactions.reduce((sum, tx) => sum + tx.amountCents, 0);
  const count = batch.transactions.length;
  const transactions = batch.transactions
    .map((tx) =>
      `<DrctDbtTxInf><PmtId><EndToEndId>${esc(ref(tx.endToEndId))}</EndToEndId></PmtId><InstdAmt Ccy="EUR">${amount(tx.amountCents)}</InstdAmt>` +
      `<DrctDbtTx><MndtRltdInf><MndtId>${esc(ref(tx.mandateId))}</MndtId><DtOfSgntr>${tx.mandateDate}</DtOfSgntr></MndtRltdInf></DrctDbtTx>` +
      `<DbtrAgt>${agent(tx.debtorBic)}</DbtrAgt><Dbtr><Nm>${esc(sepaText(tx.debtorName, 70))}</Nm></Dbtr><DbtrAcct><Id><IBAN>${iban(tx.debtorIban)}</IBAN></Id></DbtrAcct>` +
      `<RmtInf><Ustrd>${esc(sepaText(tx.remittance, 140))}</Ustrd></RmtInf></DrctDbtTxInf>`,
    )
    .join("");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    "<CstmrDrctDbtInitn>",
    `<GrpHdr><MsgId>${esc(ref(batch.messageId))}</MsgId><CreDtTm>${batch.createdAt.toISOString().slice(0, 19)}</CreDtTm><NbOfTxs>${count}</NbOfTxs><CtrlSum>${amount(total)}</CtrlSum><InitgPty><Nm>${esc(sepaText(batch.creditor.name, 70))}</Nm></InitgPty></GrpHdr>`,
    `<PmtInf><PmtInfId>${esc(ref(batch.messageId))}</PmtInfId><PmtMtd>DD</PmtMtd><BtchBookg>true</BtchBookg><NbOfTxs>${count}</NbOfTxs><CtrlSum>${amount(total)}</CtrlSum>` +
      `<PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><LclInstrm><Cd>CORE</Cd></LclInstrm><SeqTp>RCUR</SeqTp></PmtTpInf><ReqdColltnDt>${batch.collectionDate}</ReqdColltnDt>` +
      `<Cdtr><Nm>${esc(sepaText(batch.creditor.name, 70))}</Nm></Cdtr><CdtrAcct><Id><IBAN>${iban(batch.creditor.iban)}</IBAN></Id></CdtrAcct><CdtrAgt>${agent(batch.creditor.bic)}</CdtrAgt><ChrgBr>SLEV</ChrgBr>` +
      `<CdtrSchmeId><Id><PrvtId><Othr><Id>${esc(batch.creditor.creditorId.replace(/\s/g, "").toUpperCase())}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>${transactions}</PmtInf>`,
    "</CstmrDrctDbtInitn>",
    "</Document>",
  ].join("\n");
}

/** En erken tahsilat günü: bugün + n iş günü (hafta sonu atlanır; TARGET2 tatilleri dikkate alınmaz). */
export function earliestCollectionDate(from: Date, businessDays = 2): string {
  const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let added = 0;
  while (added < businessDays) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return date.toISOString().slice(0, 10);
}
