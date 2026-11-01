import assert from "node:assert/strict";
import { test } from "node:test";

import { parseInboxMessage } from "../src/modules/mail/services/inbox-parse";

const pdf = Buffer.from("%PDF-1.4\n% test\n").toString("base64");
const raw = [
  "From: Lieferant Test <rechnung@example.com>",
  "To: belege@example.org",
  "Subject: Rechnung 4711",
  "Date: Mon, 26 Oct 2026 10:00:00 +0100",
  "Message-ID: <abc@example.com>",
  "MIME-Version: 1.0",
  'Content-Type: multipart/mixed; boundary="B"',
  "",
  "--B",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Sehr geehrte Damen und Herren,   anbei die Rechnung.",
  "--B",
  'Content-Type: application/pdf; name="Rechnung-4711.pdf"',
  'Content-Disposition: attachment; filename="Rechnung-4711.pdf"',
  "Content-Transfer-Encoding: base64",
  "",
  pdf,
  "--B",
  'Content-Type: application/zip; name="viren.zip"',
  'Content-Disposition: attachment; filename="viren.zip"',
  "Content-Transfer-Encoding: base64",
  "",
  Buffer.from("PK").toString("base64"),
  "--B--",
  "",
].join("\r\n");

test("e-posta ayrıştırma: başlıklar, kısa özet ve yalnızca belge ekleri", async () => {
  const parsed = await parseInboxMessage(Buffer.from(raw));
  assert.equal(parsed.subject, "Rechnung 4711");
  assert.equal(parsed.fromAddress, "rechnung@example.com");
  assert.equal(parsed.fromName, "Lieferant Test");
  assert.equal(parsed.messageId, "<abc@example.com>");
  assert.equal(parsed.snippet, "Sehr geehrte Damen und Herren, anbei die Rechnung.");
  assert.equal(parsed.attachments.length, 1);
  assert.equal(parsed.attachments[0].fileName, "Rechnung-4711.pdf");
  assert.equal(parsed.attachments[0].extension, "pdf");
  assert.equal(parsed.skippedAttachments, 1);
});
