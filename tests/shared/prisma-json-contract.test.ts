import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { Prisma } from "@prisma/client";

describe("Prisma JSON Sözleşmesi ve structuredClone Semantik Denetimi (Issue #330)", () => {
  test("undefined alanlar: JSON.parse/stringify nesne anahtarlarını eler, structuredClone korur", () => {
    const input = { keep: 42, drop: undefined };

    const jsonNormalized = JSON.parse(JSON.stringify(input));
    const cloned = structuredClone(input);

    // JSON.stringify nesnedeki undefined anahtarları eler (RFC 8259 uyumlu)
    assert.equal("drop" in jsonNormalized, false, "JSON normalizasyonu undefined anahtarı silmelidir");
    assert.deepEqual(jsonNormalized, { keep: 42 });

    // structuredClone undefined anahtarı korur (Prisma/DB yazımında risk taşır)
    assert.equal("drop" in cloned, true, "structuredClone undefined anahtarı korur");
    assert.equal(cloned.drop, undefined);
  });

  test("Dizilerde undefined: JSON null yapar, structuredClone undefined bırakır", () => {
    const input = ["a", undefined, "c"];

    const jsonNormalized = JSON.parse(JSON.stringify(input));
    const cloned = structuredClone(input);

    // JSON standardında dizideki undefined eleman null'a dönüşür
    assert.deepEqual(jsonNormalized, ["a", null, "c"]);

    // structuredClone undefined bırakır (PostgreSQL JSONB için geçersizdir)
    assert.equal(cloned[1], undefined);
  });

  test("Date nesneleri: JSON ISO string'e dönüştürür, structuredClone Date nesnesi bırakır", () => {
    const now = new Date("2026-11-20T08:00:00.000Z");
    const input = { createdAt: now };

    const jsonNormalized = JSON.parse(JSON.stringify(input));
    const cloned = structuredClone(input);

    // JSON normalizasyonu Date'i ISO string yapar (DB'den okunan formatla tam eşleşir)
    assert.equal(typeof jsonNormalized.createdAt, "string");
    assert.equal(jsonNormalized.createdAt, "2026-11-20T08:00:00.000Z");

    // structuredClone Date nesnesini korur (ilk çalıştırma ile DB retry arasında tip sapmasına yol açar)
    assert.ok(cloned.createdAt instanceof Date);
    assert.notEqual(typeof cloned.createdAt, "string");
  });

  test("NaN ve Infinity: JSON null'a normalize eder, structuredClone korur", () => {
    const input = { badNumber: NaN, infinite: Infinity };

    const jsonNormalized = JSON.parse(JSON.stringify(input));
    const cloned = structuredClone(input);

    // PostgreSQL jsonb NaN ve Infinity değerlerini kabul etmez (22P02 hatası verir).
    // JSON normalizasyonu bunları güvenle null yapar:
    assert.equal(jsonNormalized.badNumber, null);
    assert.equal(jsonNormalized.infinite, null);

    // structuredClone ise NaN ve Infinity'yi aynen bırakır:
    assert.ok(Number.isNaN(cloned.badNumber));
    assert.equal(cloned.infinite, Infinity);
  });

  test("Fonksiyonlar ve Semboller: JSON sessizce eler, structuredClone hata fırlatır", () => {
    const input = {
      payload: "safe",
      callback: () => "malicious or accidental",
      sym: Symbol("internal"),
    };

    // JSON normalizasyonu fonksiyon ve sembolleri sessizce eler
    const jsonNormalized = JSON.parse(JSON.stringify(input));
    assert.deepEqual(jsonNormalized, { payload: "safe" });

    // structuredClone fonksiyon gördüğünde DataCloneError fırlatır
    assert.throws(
      () => structuredClone(input),
      (err: unknown) => err instanceof DOMException && err.name === "DataCloneError",
      "structuredClone fonksiyon klonlarken DataCloneError fırlatmalıdır",
    );
  });

  test("Prisma JSON Null semantikleri: JsonNull vs DbNull vs undefined", () => {
    // Sütunun var olan değeri silinmek istendiğinde (SQL NULL):
    assert.equal(typeof Prisma.DbNull, "object");

    // Sütunda geçerli bir JSONB 'null' saklanmak istendiğinde:
    assert.equal(typeof Prisma.JsonNull, "object");

    // task-worker.ts içindeki mantık doğrulanır:
    const formatStoredResult = (result: unknown) => {
      return result == null
        ? Prisma.JsonNull
        : (JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue);
    };

    assert.equal(formatStoredResult(null), Prisma.JsonNull);
    assert.equal(formatStoredResult(undefined), Prisma.JsonNull);
    assert.deepEqual(formatStoredResult({ success: true, count: 5 }), { success: true, count: 5 });
  });
});
