import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import { isValidTreasurerReportFile } from "@/modules/accounting/services/treasurer-report-file";
import { isAllowedKositAddress, validateWithKosit } from "@/modules/accounting/services/kosit";
import { eventCreateSchema } from "@/modules/events/schemas/event-schema";
import { buildChildRenderEnv } from "@/modules/exports/services/document-pipeline";
import { feedbackCreateSchema } from "@/modules/feedback/schemas/feedback";
import { parseInboxMessage } from "@/modules/mail/services/inbox-parse";
import { buildDownloadResponse } from "@/shared/files/http";

test("S2-1: treasurer report ?file= strictly allows only accounting/reports/{year}/{uuid}.pdf", () => {
  assert.equal(
    isValidTreasurerReportFile("accounting/reports/2026/123e4567-e89b-12d3-a456-426614174000.pdf"),
    true,
  );
  assert.equal(isValidTreasurerReportFile("organization/logo.png"), false);
  assert.equal(isValidTreasurerReportFile("donations/2026/123e4567-e89b-12d3-a456-426614174000.pdf"), false);
  assert.equal(isValidTreasurerReportFile("accounting/reports/2026/../../organization/logo.png"), false);
  assert.equal(isValidTreasurerReportFile("accounting/reports/2026/not-a-uuid.pdf"), false);
  assert.equal(isValidTreasurerReportFile("accounting/reports/2026/123e4567-e89b-12d3-a456-426614174000.html"), false);
});

test("S2-2: KoSIT SSRF guard blocks loopback, RFC1918, link-local, and cloud metadata IPs", async () => {
  for (const blocked of [
    "127.0.0.1",
    "::1",
    "10.0.0.5",
    "172.16.0.1",
    "192.168.1.10",
    "169.254.169.254",
    "::ffff:169.254.169.254",
    "::ffff:127.0.0.1",
    "fe80::1",
    "fd00:ec2::254",
    "0.0.0.0",
    "224.0.0.1",
    "100.64.0.1",
  ]) {
    assert.equal(isAllowedKositAddress(blocked, { allowPrivate: false }), false, `expected ${blocked} blocked`);
  }

  assert.equal(isAllowedKositAddress("93.184.216.34", { allowPrivate: false }), true);
  assert.equal(isAllowedKositAddress("2606:2800:220:1:248:1893:25c8:1946", { allowPrivate: false }), true);

  // Even when operator enables private LAN KoSIT, cloud metadata & link-local MUST stay blocked
  assert.equal(isAllowedKositAddress("127.0.0.1", { allowPrivate: true }), true);
  assert.equal(isAllowedKositAddress("169.254.169.254", { allowPrivate: true }), false);
  assert.equal(isAllowedKositAddress("::ffff:169.254.169.254", { allowPrivate: true }), false);
  assert.equal(isAllowedKositAddress("fd00:ec2::254", { allowPrivate: true }), false);

  const rebindResult = await validateWithKosit("http://kosit.example.org/validate", "<Invoice/>", {
    allowPrivate: false,
    resolve: (async () => [{ address: "169.254.169.254", family: 4 }]) as never,
  });
  assert.deepEqual(rebindResult, { ok: false });
});

test("S2-3: mail inbox rejects spoofed HTML/PDF and HTML/XML attachments and normalizes canonical MIME", async () => {
  const htmlAsPdf = Buffer.from("<html><script>alert(1)</script></html>").toString("base64");
  const htmlAsXml = Buffer.from("<!DOCTYPE html><html><script>alert(1)</script></html>").toString("base64");
  const validPdf = Buffer.from("%PDF-1.4\n% valid\n").toString("base64");
  const raw = [
    "From: Attacker <a@example.com>",
    "To: inbox@example.org",
    "Subject: Spoofed",
    "MIME-Version: 1.0",
    'Content-Type: multipart/mixed; boundary="X"',
    "",
    "--X",
    'Content-Type: text/html; name="evil.pdf"',
    'Content-Disposition: attachment; filename="evil.pdf"',
    "Content-Transfer-Encoding: base64",
    "",
    htmlAsPdf,
    "--X",
    'Content-Type: application/xml; name="evil.xml"',
    'Content-Disposition: attachment; filename="evil.xml"',
    "Content-Transfer-Encoding: base64",
    "",
    htmlAsXml,
    "--X",
    'Content-Type: application/octet-stream; name="real.pdf"',
    'Content-Disposition: attachment; filename="real.pdf"',
    "Content-Transfer-Encoding: base64",
    "",
    validPdf,
    "--X--",
  ].join("\r\n");

  const parsed = await parseInboxMessage(Buffer.from(raw));
  assert.equal(parsed.attachments.length, 1);
  assert.equal(parsed.skippedAttachments, 2);
  assert.equal(parsed.attachments[0].fileName, "real.pdf");
  assert.equal(parsed.attachments[0].mimeType, "application/pdf");
});

test("S2-4: buildDownloadResponse downgrades active MIME types and sandboxes inline previews", () => {
  const emptyStream = () => new ReadableStream<Uint8Array>({ start(c) { c.close(); } });

  const xssRes = buildDownloadResponse({
    stream: emptyStream(),
    originalName: "report.pdf",
    mimeType: "text/html; charset=utf-8",
    inline: true,
  });
  assert.equal(xssRes.headers.get("Content-Type"), "application/octet-stream");
  assert.match(xssRes.headers.get("Content-Disposition") ?? "", /^attachment;/);

  const svgRes = buildDownloadResponse({
    stream: emptyStream(),
    originalName: "logo.png",
    mimeType: "image/svg+xml",
    inline: true,
  });
  assert.equal(svgRes.headers.get("Content-Type"), "application/octet-stream");
  assert.match(svgRes.headers.get("Content-Disposition") ?? "", /^attachment;/);

  const safePdfRes = buildDownloadResponse({
    stream: emptyStream(),
    originalName: "doc.pdf",
    mimeType: "application/pdf",
    inline: true,
  });
  assert.equal(safePdfRes.headers.get("Content-Type"), "application/pdf");
  assert.match(safePdfRes.headers.get("Content-Disposition") ?? "", /^inline;/);
  assert.equal(safePdfRes.headers.get("Content-Security-Policy"), "sandbox");
});

test("S2-5: events.onlineUrl and feedback.pageUrl reject javascript: and external/protocol-relative payloads", () => {
  const baseEvent = {
    title: "Test Event",
    startDate: "2026-06-01T10:00",
    isOnline: true,
  };
  assert.equal(eventCreateSchema.safeParse({ ...baseEvent, onlineUrl: "javascript:alert(1)" }).success, false);
  assert.equal(eventCreateSchema.safeParse({ ...baseEvent, onlineUrl: "data:text/html,<script>" }).success, false);
  assert.equal(eventCreateSchema.safeParse({ ...baseEvent, onlineUrl: "https://meet.example.org/abc" }).success, true);

  const baseFeedback = {
    type: "BUG",
    title: "Broken button",
    description: "Button does not respond when clicked.",
  };
  assert.equal(feedbackCreateSchema.safeParse({ ...baseFeedback, pageUrl: "javascript:alert(1)" }).success, false);
  assert.equal(feedbackCreateSchema.safeParse({ ...baseFeedback, pageUrl: "//evil.example/phish" }).success, false);
  assert.equal(feedbackCreateSchema.safeParse({ ...baseFeedback, pageUrl: "https://evil.example" }).success, false);
  assert.equal(feedbackCreateSchema.safeParse({ ...baseFeedback, pageUrl: "/muhasebe?yil=2026" }).success, true);
  assert.equal(feedbackCreateSchema.safeParse({ ...baseFeedback, pageUrl: "" }).success, true);
});

test("S2-6: youth-protection print handlers never interpolate letterText into document.write", async () => {
  for (const rel of [
    "src/modules/youth-protection/components/fee-exemption-letter-modal.tsx",
    "src/modules/youth-protection/components/fee-exemption-letter-drawer-content.tsx",
  ]) {
    const src = await readFile(path.resolve(process.cwd(), rel), "utf8");
    assert.equal(src.includes("${letterText}"), false, `${rel} must not interpolate letterText into HTML`);
    assert.equal(src.includes("body.textContent = letterText"), true, `${rel} must assign letterText via textContent`);
  }
});

test("S2-7: PDF child render env allowlist strips secrets and NODE_OPTIONS", () => {
  const env = buildChildRenderEnv({
    PATH: "/usr/bin",
    NODE_ENV: "production",
    TZ: "Europe/Berlin",
    DATABASE_URL: "postgres://secret",
    AUTH_SECRET: "super-secret",
    NODE_OPTIONS: "--conditions=react-server",
    SMTP_PASS: "mail-secret",
  });
  assert.equal(env.PATH, "/usr/bin");
  assert.equal(env.NODE_ENV, "production");
  assert.equal(env.TZ, "Europe/Berlin");
  assert.equal(env.DATABASE_URL, undefined);
  assert.equal(env.AUTH_SECRET, undefined);
  assert.equal(env.NODE_OPTIONS, undefined);
  assert.equal(env.SMTP_PASS, undefined);
});
