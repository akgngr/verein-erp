import assert from "node:assert/strict";
import { test } from "node:test";

import { toElsterTaxNumber } from "@/modules/accounting/services/elster-taxnumber";
import { buildElsterUstvaXml, elsterPeriod } from "@/modules/accounting/services/elster-ustva";

test("ELSTER Steuernummer: state formats → 13 digits (FFFF0BBBUUUUP)", () => {
  assert.equal(toElsterTaxNumber("93815/08152", "BW"), "2893081508152");
  assert.equal(toElsterTaxNumber("181/815/08155", "BY"), "9181081508155");
  assert.equal(toElsterTaxNumber("21/815/08150", "BE"), "1121081508150");
  assert.equal(toElsterTaxNumber("048/815/08155", "BB"), "3048081508155");
  assert.equal(toElsterTaxNumber("75 815 08152", "HB"), "2475081508152");
  assert.equal(toElsterTaxNumber("02/815/08156", "HH"), "2202081508156");
  assert.equal(toElsterTaxNumber("013 815 08153", "HE"), "2613081508153");
  assert.equal(toElsterTaxNumber("079/815/08151", "MV"), "4079081508151");
  assert.equal(toElsterTaxNumber("24/815/08151", "NI"), "2324081508151");
  assert.equal(toElsterTaxNumber("133/8150/8159", "NW"), "5133081508159");
  assert.equal(toElsterTaxNumber("22/815/08154", "RP"), "2722081508154");
  assert.equal(toElsterTaxNumber("010/815/08182", "SL"), "1010081508182");
  assert.equal(toElsterTaxNumber("201/123/12340", "SN"), "3201012312340");
  assert.equal(toElsterTaxNumber("101/815/08154", "ST"), "3101081508154");
  assert.equal(toElsterTaxNumber("29 815 08158", "SH"), "2129081508158");
  assert.equal(toElsterTaxNumber("151/815/08156", "TH"), "4151081508156");
});

test("ELSTER Steuernummer: 13 digits pass through, wrong format → null", () => {
  assert.equal(toElsterTaxNumber("9198 0113 10010", "BY"), "9198011310010");
  assert.equal(toElsterTaxNumber("12/345", "BE"), null);
  assert.equal(toElsterTaxNumber("21/815/08150", "SN"), null); // SN numbers start with 2 and have 11 digits
});

test("ELSTER period codes", () => {
  assert.equal(elsterPeriod("MONTH", 3), "03");
  assert.equal(elsterPeriod("QUARTER", 2), "42");
  assert.throws(() => elsterPeriod("QUARTER", 5));
});

test("UStVA payload: test marker, recipient Finanzamt, Kennzahlen formats", () => {
  const xml = buildElsterUstvaXml({
    year: 2026, period: "41", taxNumber: "9198011310010",
    supplier: { name: "Musterverein & Co e.V.", street: "Vereinsweg 1", postalCode: "10115", city: "Berlin" },
    ustva: { kz81BaseEuros: 1000, kz86BaseEuros: 0, kz66Cents: 4560, kz83Cents: 14440 },
    producer: { id: "74931", name: "Verein ERP", version: "test" },
    createdAt: new Date("2026-04-02T10:00:00Z"),
  });
  assert.match(xml, /<Testmerker>700000004<\/Testmerker>/);
  assert.match(xml, /<Empfaenger id="F">9198<\/Empfaenger>/);
  assert.match(xml, /<Zeitraum>41<\/Zeitraum>/);
  assert.match(xml, /<Kz81>1000<\/Kz81>/);
  assert.doesNotMatch(xml, /<Kz86>/);
  assert.match(xml, /<Kz66>45\.60<\/Kz66>/);
  assert.match(xml, /<Kz83>144\.40<\/Kz83>/);
  assert.match(xml, /Musterverein &amp; Co e\.V\./);
  assert.throws(() => buildElsterUstvaXml({ year: 2026, period: "41", taxNumber: "12/345", supplier: { name: "x", street: "", postalCode: "", city: "" }, ustva: { kz81BaseEuros: 0, kz86BaseEuros: 0, kz66Cents: 0, kz83Cents: 0 }, producer: { id: "1", name: "x", version: "1" }, createdAt: new Date() }));
});
