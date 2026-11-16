import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { PDFDocument } from "pdf-lib";

import { analyzeDocumentBytes } from "@/modules/documents/services/document-analysis";
import { rawImageToBmp } from "@/shared/files/ocr";

const png = readFileSync("tests/fixtures/documents/invoice-scan.png");

test("rawImageToBmp: RGBA ve gri piksel → 24 bit BMP başlığı ve renk sırası", () => {
  const rgba = rawImageToBmp({ width: 2, height: 1, data: new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255]) });
  assert.equal(rgba.toString("ascii", 0, 2), "BM");
  assert.equal(rgba.readInt32LE(18), 2);
  assert.equal(rgba.readInt32LE(22), -1);
  assert.deepEqual([...rgba.subarray(54, 60)], [0, 0, 255, 255, 0, 0]); // BGR
  const gray = rawImageToBmp({ width: 1, height: 1, data: new Uint8Array([128]) });
  assert.deepEqual([...gray.subarray(54, 57)], [128, 128, 128]);
  assert.throws(() => rawImageToBmp({ width: 3, height: 3, data: new Uint8Array(5) }));
});

test("fotoğraf/tarama OCR: Almanca fatura alanları önerilir", { timeout: 120_000 }, async () => {
  const result = await analyzeDocumentBytes(png, "image/png");
  assert.equal(result.source, "ocr");
  assert.ok((result.confidence ?? 0) >= 70, `confidence ${result.confidence}`);
  assert.equal(result.suggestions.referenceNumber, "RE-2026-4711");
  assert.equal(result.suggestions.documentDate, "2026-11-02");
  assert.equal(result.suggestions.dueDate, "2026-11-30");
  assert.equal(result.suggestions.amountCents, 123456);
  assert.equal(result.suggestions.iban, "DE89370400440532013000");
  assert.match(result.suggestions.counterparty ?? "", /Stadtwerke K.ln GmbH/);
});

test("metin katmanı olmayan (taranmış) PDF OCR ile okunur", { timeout: 120_000 }, async () => {
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(png);
  pdf.addPage([image.width, image.height]).drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  const result = await analyzeDocumentBytes(await pdf.save(), "application/pdf");
  assert.equal(result.source, "ocr");
  assert.equal(result.suggestions.referenceNumber, "RE-2026-4711");
  assert.equal(result.suggestions.amountCents, 123456);
});
