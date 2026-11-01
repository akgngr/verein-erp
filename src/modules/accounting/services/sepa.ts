/**
 * ACC-6 SEPA havale dosyası (pain.001.001.09, DK/EPC uyumlu). Bankaya yüklenir; gerçek
 * ödeme banka ekstresi içe aktarılınca eşleştirilir (ACC-4). Bağımlılıksız, saf.
 */
export type SepaPayment = { endToEndId: string; amountCents: number; creditorName: string; creditorIban: string; creditorBic: string | null; remittance: string };
export type SepaBatch = { messageId: string; createdAt: Date; executionDate: string; debtor: { name: string; iban: string; bic: string | null }; payments: SepaPayment[] };

/** IBAN mod-97 kontrolü (ISO 13616). */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const value = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** SEPA karakter kümesi: Latin temel + ä/ö/ü/ß dönüşümü; diğerleri boşluk. */
export function sepaText(value: string, max: number): string {
  return value
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9/?:().,'+\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const amount = (cents: number) => (cents / 100).toFixed(2);
const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildPain001(batch: SepaBatch): string {
  const total = batch.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const bicBlock = (bic: string | null) => (bic ? `<BICFI>${esc(bic)}</BICFI>` : "<Othr><Id>NOTPROVIDED</Id></Othr>");
  const transactions = batch.payments
    .map(
      (payment) => `<CdtTrfTxInf><PmtId><EndToEndId>${esc(sepaText(payment.endToEndId, 35) || "NOTPROVIDED")}</EndToEndId></PmtId><Amt><InstdAmt Ccy="EUR">${amount(payment.amountCents)}</InstdAmt></Amt>${payment.creditorBic ? `<CdtrAgt><FinInstnId><BICFI>${esc(payment.creditorBic)}</BICFI></FinInstnId></CdtrAgt>` : ""}<Cdtr><Nm>${esc(sepaText(payment.creditorName, 70))}</Nm></Cdtr><CdtrAcct><Id><IBAN>${payment.creditorIban.replace(/\s/g, "").toUpperCase()}</IBAN></Id></CdtrAcct><RmtInf><Ustrd>${esc(sepaText(payment.remittance, 140))}</Ustrd></RmtInf></CdtTrfTxInf>`,
    )
    .join("");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    "<CstmrCdtTrfInitn>",
    `<GrpHdr><MsgId>${esc(sepaText(batch.messageId, 35))}</MsgId><CreDtTm>${batch.createdAt.toISOString().slice(0, 19)}</CreDtTm><NbOfTxs>${batch.payments.length}</NbOfTxs><CtrlSum>${amount(total)}</CtrlSum><InitgPty><Nm>${esc(sepaText(batch.debtor.name, 70))}</Nm></InitgPty></GrpHdr>`,
    `<PmtInf><PmtInfId>${esc(sepaText(batch.messageId, 35))}</PmtInfId><PmtMtd>TRF</PmtMtd><BtchBookg>true</BtchBookg><NbOfTxs>${batch.payments.length}</NbOfTxs><CtrlSum>${amount(total)}</CtrlSum><PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf><ReqdExctnDt><Dt>${batch.executionDate}</Dt></ReqdExctnDt><Dbtr><Nm>${esc(sepaText(batch.debtor.name, 70))}</Nm></Dbtr><DbtrAcct><Id><IBAN>${batch.debtor.iban.replace(/\s/g, "").toUpperCase()}</IBAN></Id></DbtrAcct><DbtrAgt><FinInstnId>${bicBlock(batch.debtor.bic)}</FinInstnId></DbtrAgt><ChrgBr>SLEV</ChrgBr>${transactions}</PmtInf>`,
    "</CstmrCdtTrfInitn>",
    "</Document>",
  ].join("\n");
}
