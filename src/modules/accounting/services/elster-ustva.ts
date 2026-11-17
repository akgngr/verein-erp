import type { UstvaResult } from "./tax-reports";

/**
 * ELSTER-2: UStVA payload (ElsterAnmeldung / Anmeldungssteuern) for **validation only** with ERiC
 * (bearbeitungsFlags = validate, Testmerker). No transmission is implemented. Amounts follow the form:
 * Bemessungsgrundlagen (Kz 81/86) in whole euros, Vorsteuer (Kz 66) and Vorauszahlung (Kz 83) with cents.
 * The exact schema version is checked by ERiC in CI (scripts/elster); see docs/ELSTER_ERIC.md.
 */
export type ElsterUstvaInput = {
  year: number;
  /** "01".."12" for months, "41".."44" for quarters (ELSTER Zeitraum codes). */
  period: string;
  /** 13-digit ELSTER Steuernummer (toElsterTaxNumber). */
  taxNumber: string;
  /** Data supplier shown in the payload. The recipient Finanzamt (Empfaenger) is taken from the first four digits of taxNumber. */
  supplier: { name: string; street: string; postalCode: string; city: string; phone?: string | null; email?: string | null };
  ustva: Pick<UstvaResult, "kz81BaseEuros" | "kz86BaseEuros" | "kz66Cents" | "kz83Cents">;
  producer: { id: string; name: string; version: string };
  /** Testmerker 700000004 marks a test case; ELSTER never processes it as a real filing. */
  testMarker?: string;
  createdAt: Date;
};

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tag = (name: string, value: string | null | undefined) => (value ? `<${name}>${esc(value)}</${name}>` : "");
const cents = (value: number) => (value / 100).toFixed(2);

/** ELSTER Zeitraum code for a month (1–12) or quarter (1–4). */
export function elsterPeriod(kind: "MONTH" | "QUARTER", part: number): string {
  if (kind === "MONTH" && part >= 1 && part <= 12) return String(part).padStart(2, "0");
  if (kind === "QUARTER" && part >= 1 && part <= 4) return String(40 + part);
  throw new RangeError("ELSTER_INVALID_PERIOD");
}

export function buildElsterUstvaXml(input: ElsterUstvaInput): string {
  if (!/^\d{13}$/.test(input.taxNumber)) throw new RangeError("ELSTER_INVALID_TAX_NUMBER");
  const date = input.createdAt.toISOString().slice(0, 10).replace(/-/g, "");
  const supplier = input.supplier;
  const kz = [
    input.ustva.kz81BaseEuros ? tag("Kz81", String(input.ustva.kz81BaseEuros)) : "",
    input.ustva.kz86BaseEuros ? tag("Kz86", String(input.ustva.kz86BaseEuros)) : "",
    input.ustva.kz66Cents ? tag("Kz66", cents(input.ustva.kz66Cents)) : "",
    tag("Kz83", cents(input.ustva.kz83Cents)),
  ].join("");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">',
    '<TransferHeader version="11">',
    "<Verfahren>ElsterAnmeldung</Verfahren><DatenArt>UStVA</DatenArt><Vorgang>send-Auth</Vorgang>", // i18n-ignore (ELSTER protocol)
    tag("Testmerker", input.testMarker ?? "700000004"),
    tag("HerstellerID", input.producer.id),
    tag("DatenLieferant", supplier.name),
    "<Datei><Verschluesselung>CMSEncryptedData</Verschluesselung><Kompression>GZIP</Kompression><TransportSchluessel/></Datei>", // i18n-ignore (ELSTER protocol)
    "</TransferHeader>",
    "<DatenTeil><Nutzdatenblock>",
    '<NutzdatenHeader version="11"><NutzdatenTicket>1</NutzdatenTicket>',
    `<Empfaenger id="F">${input.taxNumber.slice(0, 4)}</Empfaenger>`,
    `<Hersteller>${tag("ProduktName", input.producer.name)}${tag("ProduktVersion", input.producer.version)}</Hersteller>`,
    "</NutzdatenHeader>",
    `<Nutzdaten><Anmeldungssteuern art="UStVA" version="${input.year}">`,
    `<DatenLieferant>${tag("Name", supplier.name)}${tag("Strasse", supplier.street)}${tag("PLZ", supplier.postalCode)}${tag("Ort", supplier.city)}${tag("Telefon", supplier.phone)}${tag("Email", supplier.email)}</DatenLieferant>`,
    tag("Erstellungsdatum", date),
    "<Steuerfall><Umsatzsteuervoranmeldung>",
    tag("Jahr", String(input.year)),
    tag("Zeitraum", input.period),
    tag("Steuernummer", input.taxNumber),
    kz,
    "</Umsatzsteuervoranmeldung></Steuerfall>",
    "</Anmeldungssteuern></Nutzdaten>",
    "</Nutzdatenblock></DatenTeil>",
    "</Elster>",
  ].join("\n");
}
