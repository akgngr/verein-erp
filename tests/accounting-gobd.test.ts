import assert from "node:assert/strict";
import { test } from "node:test";

import { gdpduCell, gdpduCsv, gdpduIndex, type GdpduTable } from "../src/modules/accounting/services/gdpdu";
import { GENESIS_HASH, chainHash, snapshotHash, verifyJournal } from "../src/modules/accounting/services/journal";
import { buildZip, crc32 } from "../src/modules/accounting/services/zip";


test("CRC-32 ve ZIP yapısı", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  const zip = buildZip([{ name: "a.txt", data: new TextEncoder().encode("hallo"), date: new Date("2026-01-01T00:00:00Z") }, { name: "ü.csv", data: new TextEncoder().encode("x;y\r\n") }]);
  const view = new DataView(zip.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  const end = zip.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50);
  assert.equal(view.getUint16(end + 10, true), 2);
  // Yerel başlıktaki içerik STORE: düz metin okunur.
  assert.equal(new TextDecoder().decode(zip.subarray(30 + 5, 30 + 5 + 5)), "hallo");
});

const table: GdpduTable = {
  file: "buchungen.csv", name: "Buchungen", description: "Buchungsjournal", primaryKey: "Belegnummer",
  columns: [{ name: "Belegnummer", description: "Nr.", type: "AlphaNumeric" }, { name: "Datum", description: "Datum", type: "Date" }, { name: "Betrag", description: "EUR", type: "Numeric", accuracy: 2 }],
  rows: [["B-2026-0001", "2026-03-05", 119], ['Te"st;', null, 1234.5]],
};

test("GDPdU CSV ve index.xml", () => {
  assert.equal(gdpduCell(1234.5, table.columns[2]), "1234,50");
  assert.equal(gdpduCell("2026-03-05", table.columns[1]), "05.03.2026");
  assert.equal(gdpduCsv(table), '"B-2026-0001";05.03.2026;119,00\r\n"Te""st;";;1234,50\r\n');
  const xml = gdpduIndex({ supplierName: "Verein & Co", location: "Berlin", comment: "Z3", mediaName: "Jahr 2026", from: "2026-01-01", to: "2026-12-31", tables: [table] });
  assert.match(xml, /<!DOCTYPE DataSet SYSTEM "gdpdu-01-09-2004.dtd">/);
  assert.match(xml, /<VariablePrimaryKey><Name>Belegnummer<\/Name>/);
  assert.match(xml, /<From>01.01.2026<\/From>/);
  assert.match(xml, /Verein &amp; Co/);
  assert.equal((xml.match(/<VariableColumn>/g) ?? []).length, 2);
});

test("günlük zinciri doğrulama: değişiklik, kopukluk, günlüksüz fiş", () => {
  const snap = (amount: string) => ({ amount, bookingNumber: "B-1" });
  const created = new Date("2026-01-01T10:00:00Z");
  const e1 = { seq: 1, bookingId: "b1", bookingNumber: "B-1", event: "CREATE", snapshot: snap("10.00"), snapshotHash: snapshotHash(snap("10.00")), prevHash: GENESIS_HASH, hash: "", createdAt: created };
  e1.hash = chainHash(GENESIS_HASH, { seq: 1, bookingId: "b1", event: "CREATE", snapshotHash: e1.snapshotHash, createdAt: created.toISOString() });
  const e2 = { ...e1, seq: 2, event: "UPDATE", snapshot: snap("12.00"), snapshotHash: snapshotHash(snap("12.00")), prevHash: e1.hash, hash: "" };
  e2.hash = chainHash(e1.hash, { seq: 2, bookingId: "b1", event: "UPDATE", snapshotHash: e2.snapshotHash, createdAt: created.toISOString() });
  const current = new Map([["b1", { bookingNumber: "B-1", snapshot: snap("12.00") }]]);
  assert.deepEqual(verifyJournal([e1, e2], current), []);
  // Fiş günlük dışında değiştirildi.
  assert.deepEqual(verifyJournal([e1, e2], new Map([["b1", { bookingNumber: "B-1", snapshot: snap("99.00") }]])).map((p) => p.kind), ["modifiedAfterJournal"]);
  // Günlük kaydı kurcalandı.
  const tampered = { ...e1, snapshot: snap("11.00") };
  assert.ok(verifyJournal([tampered, e2], current).some((p) => p.kind === "snapshotMismatch"));
  // Kayıt silindi → kopukluk + zincir kırık.
  const kinds = verifyJournal([e2], current).map((p) => p.kind);
  assert.ok(kinds.includes("gap") && kinds.includes("brokenChain"));
  // Günlüğe hiç girmemiş fiş.
  assert.deepEqual(verifyJournal([], current).map((p) => p.kind), ["unjournaled"]);
});
