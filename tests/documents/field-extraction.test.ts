import assert from "node:assert/strict";
import { test } from "node:test";

import { extractDocumentFields, parseMoney } from "@/modules/documents/services/field-extraction";

test("Almanca fatura: tarih, termin, referans, konu, gönderen, tutar, IBAN", () => {
  const text = `Stadtwerke Köln GmbH
Zülpicher Straße 1, 50674 Köln
Rechnungsdatum: 02.11.2026
Rechnung Nr. RE-2026-4711
Betreff: Rechnung Stromlieferung Oktober
Gesamtbetrag: 1.234,56 €
Zahlbar bis zum 30.11.2026 auf IBAN DE89 3704 0044 0532 0130 00.`;
  assert.deepEqual(extractDocumentFields(text), {
    documentDate: "2026-11-02",
    dueDate: "2026-11-30",
    referenceNumber: "RE-2026-4711",
    subject: "Rechnung Stromlieferung Oktober",
    counterparty: "Stadtwerke Köln GmbH",
    amountCents: 123456,
    iban: "DE89370400440532013000",
    kind: "invoice",
  });
});

test("Resmî yazı (Bescheid): ay adıyla tarih, Aktenzeichen, Frist", () => {
  const text = `Finanzamt Köln-Altstadt
Köln, 5. März 2026
Aktenzeichen: 214/5678/1234
Bescheid über Körperschaftsteuer
Bitte reichen Sie die Unterlagen spätestens am 15.04.2026 ein.`;
  const result = extractDocumentFields(text);
  assert.equal(result.counterparty, "Finanzamt Köln-Altstadt");
  assert.equal(result.documentDate, "2026-03-05");
  assert.equal(result.dueDate, "2026-04-15");
  assert.equal(result.referenceNumber, "214/5678/1234");
  assert.equal(result.subject, "Bescheid über Körperschaftsteuer");
  assert.equal(result.kind, "notice");
  assert.equal(result.amountCents, undefined);
});

test("Türkçe yazı: tarih, sayı, konu, son ödeme", () => {
  const text = `Kadıköy Belediye Başkanlığı
Tarih: 12 Kasım 2026
Sayı: E-12345678-100
Konu: Kira bedeli hk.
Toplam tutar 2.500,00 TL olup son ödeme tarihi 01.12.2026'dir.`;
  const result = extractDocumentFields(text);
  assert.equal(result.counterparty, "Kadıköy Belediye Başkanlığı");
  assert.equal(result.documentDate, "2026-11-12");
  assert.equal(result.dueDate, "2026-12-01");
  assert.equal(result.referenceNumber, "E-12345678-100");
  assert.equal(result.subject, "Kira bedeli hk.");
  assert.equal(result.amountCents, 250000);
});

test("Geçersiz IBAN, olmayan tarih ve boş metin önerilmez", () => {
  const result = extractDocumentFields("Einladung zur Mitgliederversammlung\nDatum: 31.02.2026\nIBAN DE00 1234 5678 9012 3456 78");
  assert.equal(result.iban, undefined);
  assert.equal(result.documentDate, undefined);
  assert.equal(result.subject, "Einladung zur Mitgliederversammlung");
  assert.deepEqual(extractDocumentFields("   \n "), {});
});

test("parseMoney biçimleri", () => {
  assert.equal(parseMoney("1.234,56"), 123456);
  assert.equal(parseMoney("1,234.56"), 123456);
  assert.equal(parseMoney("99,90 €"), 9990);
  assert.equal(parseMoney("1500"), 150000);
  assert.equal(parseMoney("abc"), null);
});
