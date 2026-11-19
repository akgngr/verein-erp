/**
 * S5.1 (#315) — OCR alan önerileri: yerel, alan başına kaynak/güven, düşük güven işareti, otomatik yazma yok.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { analyzeDocumentBytes, OCR_CONFIDENCE_THRESHOLD, provenanceOf } from "@/modules/documents/services/document-analysis";

test("provenance: değerin satırı bulunur; normalleştirilmiş alanlarda satır yok", () => {
  const text = "Musterfirma GmbH\nRechnungsnummer: RE-2026-4711\nDatum 02.11.2026";
  const provenance = provenanceOf(text, { referenceNumber: "RE-2026-4711", documentDate: "2026-11-02", amountCents: 100, kind: "invoice" }, "ocr", 81);
  assert.deepEqual(provenance.referenceNumber, { source: "ocr", confidence: 81, line: 2 });
  assert.deepEqual(provenance.documentDate, { source: "ocr", confidence: 81, line: null });
  assert.equal(provenance.amountCents?.line, null);
  assert.equal(provenance.kind?.line, null);
  assert.equal(provenanceOf(text, { subject: "yok" }, "text", null).subject?.line, null);
});

test("analiz: saf (veritabanı/dosya yazmaz) ve harici ağa gitmez", () => {
  const source = readFileSync("src/modules/documents/services/document-analysis.ts", "utf8");
  for (const forbidden of ["getDb", "saveFile", "fetch(", "@/modules/ai"]) assert.ok(!source.includes(forbidden), forbidden);
});

test("OCR: her öneride kaynak ve güven; eşik altı düşük güven işaretlenir", { timeout: 120_000 }, async () => {
  const result = await analyzeDocumentBytes(readFileSync("tests/fixtures/documents/invoice-scan.png"), "image/png");
  assert.equal(result.source, "ocr");
  for (const key of Object.keys(result.suggestions)) {
    const entry = result.provenance[key as keyof typeof result.provenance];
    assert.ok(entry, key);
    assert.equal(entry.source, "ocr");
    assert.equal(entry.confidence, result.confidence);
  }
  assert.equal(result.provenance.referenceNumber?.line !== null, true, "referans satırı bulunur");
  assert.equal(result.lowConfidence, (result.confidence ?? 0) < OCR_CONFIDENCE_THRESHOLD);
});

test("metin yoksa öneri/kaynak yok", async () => {
  const result = await analyzeDocumentBytes(Buffer.from(""), "text/plain");
  assert.equal(result.source, "none");
  assert.deepEqual(result.provenance, {});
  assert.equal(result.lowConfidence, false);
});
