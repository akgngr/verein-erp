import assert from "node:assert/strict";
import { test } from "node:test";

import { findingKinds, preflightCloudText, type KnownPerson } from "@/modules/ai/services/cloud-preflight";

const known: KnownPerson[] = [
  { key: "members:m1", label: "Ayşe Yılmaz", references: ["UYE-2026-0090"] },
  { key: "members:m2", label: "Hans-Peter Müller" },
  { key: "students:s1", label: "Ali Demir" },
];
const aliases = new Map<string, string>();
const aliasFor = (key: string) => aliases.get(key) ?? (aliases.set(key, `[[K${aliases.size + 1}]]`), aliases.get(key)!);
const run = (text: string) => preflightCloudText(text, known, aliasFor);

test("kayıtlı kişiler takma ada çevrilir; aynı kişi aynı takma adı alır", () => {
  const result = run("ayşe  yılmaz ve UYE-2026-0090 aynı kişi mi? Hans-Peter Müller kaç € borçlu?");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.text, "[[K1]] ve [[K1]] aynı kişi mi? [[K2]] kaç € borçlu?");
  assert.deepEqual(result.persons, ["members:m1", "members:m2"]);
  assert.doesNotMatch(result.text, /Ayşe|Müller|UYE-/i);
});

test("genel sorular ve iş metinleri geçer (yanlış alarm yok)", () => {
  for (const text of [
    "2026'da kaç aktif üye var?",
    "Wie viele Mitglieder sind seit März 2025 eingetreten?",
    "Bu ay 12000 Euro bağış geldi mi?",
    "Erstelle eine Übersicht der offenen Rechnungen nach Kategorie",
    "Gesundheitskurs için kaç kişi kayıtlı?",
  ]) {
    const result = run(text);
    assert.equal(result.ok, true, text);
  }
});

test("bilinmeyen kişisel veri bulunursa metin gönderilmez", () => {
  const cases: Array<[string, string]> = [
    ["mail an max@beispiel.de schicken", "EMAIL"],
    ["Telefon 0171 2345678 anrufen", "PHONE"],
    ["IBAN DE89 3704 0044 0532 0130 00 kontrol et", "IBAN"],
    ["Steuernummer 12/345/67890", "TAXID"],
    ["Er wohnt in der Lindenstraße 12", "ADDRESS"],
    ["Atatürk Caddesi No: 15 adresine yaz", "ADDRESS"],
    ["Adresse 50667 Köln prüfen", "ADDRESS"],
    ["geboren am 03.04.1987", "BIRTHDATE"],
    ["Doğum tarihi 3/4/1987 olan üye", "BIRTHDATE"],
    ["Frau Schneider hat angerufen", "TITLED_NAME"],
    ["Sayın Karaca'ya cevap yaz", "TITLED_NAME"],
    ["Mehmet Kaya aidatını ödedi mi?", "LIKELY_NAME"],
  ];
  for (const [text, kind] of cases) {
    const result = run(text);
    assert.equal(result.ok, false, text);
    if (!result.ok) assert.ok(findingKinds(result.findings).includes(kind as never), `${text} → ${findingKinds(result.findings)}`);
  }
});

test("özel nitelikli veri kişiyle birlikte geçerse engellenir, tek başına konu olarak serbest", () => {
  const withPerson = run("Ayşe Yılmaz hamile, kurstan muaf tutalım");
  assert.equal(withPerson.ok, false);
  if (!withPerson.ok) assert.deepEqual(findingKinds(withPerson.findings), ["SPECIAL_CATEGORY"]);
  const withUnknown = run("Herr Becker ist krank");
  assert.equal(withUnknown.ok, false);
  assert.equal(run("Wie viele Kurse zum Thema Diabetes gab es?").ok, true);
});

test("ret sonucu metni veya kişi verisini içermez; yalnız konum ve tür", () => {
  const result = run("max@beispiel.de");
  assert.equal(result.ok, false);
  assert.ok(!("text" in result));
  if (!result.ok) assert.deepEqual(Object.keys(result.findings[0]).sort(), ["end", "kind", "start"]);
});
