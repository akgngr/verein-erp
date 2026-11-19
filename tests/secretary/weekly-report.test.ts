/**
 * S5.1 (#315) — haftalık kurul raporu: yalnız sayılar, Files hattı üzerinden PDF (doğrudan link yok),
 * çıktı doğrulaması, yetki yeniden denetimi ve çok kullanıcılı yalıtım.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { berlinWeek, buildWeeklyReport, renderWeeklyReportMarkdown } from "@/modules/secretary/services/weekly-report";
import { getDb } from "@/shared/db";
import type { Briefing } from "@/shared/secretary/define";

const NAME = "PRIVATE_NAME_SENTINEL Ayşe Yılmaz";
const briefing: Briefing = {
  generatedAt: "x",
  failures: ["documents.recent"],
  sections: [
    { module: "tasks", items: [
      { id: "tasks:overdue", module: "tasks", kind: "overdue", severity: "danger", title: `${NAME} görevi`, count: 3, href: "/tasks" },
      { id: "tasks:due-today", module: "tasks", kind: "due-today", severity: "warning", title: NAME, count: 2, href: "/tasks" },
    ] },
    { module: "accounting", items: [{ id: "accounting:dunning:i1", module: "accounting", kind: "dunning", severity: "warning", title: NAME, detail: "1.234,56 €", amountCents: 123456, href: "/muhasebe" }] },
  ],
};

test("weekly report: yalnız sayılar; başlık/ad/tutar/detay rapora girmez", () => {
  const report = buildWeeklyReport(briefing, "2031-03-27");
  assert.deepEqual(report.rows, [
    { module: "accounting", total: 1, warning: 1, danger: 0 },
    { module: "tasks", total: 5, warning: 2, danger: 3 },
  ]);
  assert.equal(report.total, 6);
  assert.equal(report.unavailable, 1);
  for (const locale of ["tr", "de"] as const) {
    const { title, markdown } = renderWeeklyReportMarkdown(report, locale);
    const all = title + markdown;
    assert.ok(!all.includes("PRIVATE_NAME_SENTINEL") && !all.includes("Ayşe") && !all.includes("1.234") && !all.includes("1234"), locale);
    assert.match(markdown, /\*\*6\*\*/);
  }
});

test("weekly report: Berlin haftası Pazartesi–Pazar; tablo hücreleri kaçışlı", () => {
  assert.deepEqual(berlinWeek("2031-03-27"), { weekStart: "2031-03-24", weekEnd: "2031-03-30" });
  assert.deepEqual(berlinWeek("2031-03-24"), { weekStart: "2031-03-24", weekEnd: "2031-03-30" });
  assert.deepEqual(berlinWeek("2031-03-30"), { weekStart: "2031-03-24", weekEnd: "2031-03-30" });
  const report = buildWeeklyReport({ generatedAt: "x", failures: [], sections: [{ module: "tasks", items: [] }] }, "2031-03-27");
  const { markdown } = renderWeeklyReportMarkdown(report, "tr", () => "Kötü | <script>\n# x");
  assert.ok(!markdown.includes("<script>") && !markdown.includes("\n# x"));
  assert.equal(buildWeeklyReport({ generatedAt: "x", failures: [], sections: [{ module: "../evil", items: [] }] }, "2031-03-27").rows.length, 0);
});

test("pipeline: PDF olmayan çıktı ve sınır aşımı reddedilir", async () => {
  const { createPipelineDocumentFile, DOCUMENT_LIMITS } = await import("@/modules/exports/services/document-pipeline");
  const base = {
    id: "x", generationId: "g", ownerId: "u", title: "Rapor", markdown: "a", source: "secretary", signal: new AbortController().signal,
    strings: { createdAt: "c", note: "n", footerTemplate: "{page}/{total}" }, letterhead: async () => ({ name: "V" }),
  };
  await assert.rejects(() => createPipelineDocumentFile({ ...base, markdown: "x".repeat(DOCUMENT_LIMITS.markdownBytes + 1) }), /EXPORT_BYTE_LIMIT/);
  await assert.rejects(() => createPipelineDocumentFile({ ...base, title: "\n\t " }), /EXPORT_TITLE_INVALID/);
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: çıktı doğrulaması — sahte (PDF olmayan) bayt saklanmaz; geçerli PDF şifreli ve yayın bekliyor", { skip: !enabled }, async () => {
  const { createPipelineDocumentFile } = await import("@/modules/exports/services/document-pipeline");
  const { readFile } = await import("node:fs/promises");
  const { resolveSafePath } = await import("@/shared/files/storage");
  const db = getDb();
  const tag = `wr-${randomUUID().slice(0, 8)}`;
  const user = await db.user.create({ data: { name: tag, email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const base = {
    generationId: `${tag}-g`, ownerId: user.id, title: "Rapor\nbaşlığı", markdown: "| a | 1 |", source: "secretary", signal: new AbortController().signal,
    strings: { createdAt: "c", note: "n", footerTemplate: "{page}/{total}" }, letterhead: async () => ({ name: "V" }),
  };
  try {
    await assert.rejects(() => createPipelineDocumentFile({ ...base, id: `${tag}-bad`, render: async () => Buffer.from("<html>not a pdf</html>") }), /EXPORT_OUTPUT_INVALID/);
    assert.equal(await db.generatedFile.count({ where: { id: `${tag}-bad` } }), 0);
    const id = await createPipelineDocumentFile({ ...base, id: `${tag}-ok`, render: async () => Buffer.from("%PDF-1.7\n%%EOF") });
    const row = await db.generatedFile.findUniqueOrThrow({ where: { id } });
    assert.equal(row.publicationPending, true, "finalizeGeneration olmadan yayınlanmaz");
    assert.equal(row.format, "pdf");
    assert.ok(row.sha256);
    const stored = await readFile(resolveSafePath(`generated/${id}.bin`));
    assert.ok(!stored.includes(Buffer.from("%PDF-")), "diskte şifreli");
    const { listPublishedFileMetadata } = await import("@/modules/exports/automation");
    assert.ok(!(await listPublishedFileMetadata(user.id)).some((file: { id: string }) => file.id === id), "yayın bekleyen dosya listelenmez");
  } finally {
    const { removeFile } = await import("@/shared/files");
    for (const id of [`${tag}-ok`, `${tag}-bad`]) await removeFile(`generated/${id}.bin`).catch(() => undefined);
    await db.generatedFile.deleteMany({ where: { ownerId: user.id } });
    await db.user.deleteMany({ where: { id: user.id } });
  }
});

test("pipeline: gerçek alt işlem çizimi — geçerli PDF, ad/içerik yalnız verilen sayılar", { skip: !enabled }, async () => {
  const { createPipelineDocumentFile } = await import("@/modules/exports/services/document-pipeline");
  const { readGeneratedFileBytesForTest } = await import("./fixtures/generated-file");
  const db = getDb();
  const tag = `wrp-${randomUUID().slice(0, 8)}`;
  const user = await db.user.create({ data: { name: tag, email: `${tag}@example.test`, passwordHash: "x", role: "ADMIN", isActive: true } });
  const report = buildWeeklyReport(briefing, "2031-03-27");
  const { title, markdown } = renderWeeklyReportMarkdown(report, "de");
  try {
    const id = await createPipelineDocumentFile({
      id: `${tag}-pdf`, generationId: `${tag}-g`, ownerId: user.id, title, markdown, source: "secretary", signal: AbortSignal.timeout(90_000),
      strings: { createdAt: "Erstellt", note: "Test", footerTemplate: "Seite {page} / {total}" }, letterhead: async () => ({ name: "Testverein" }),
    });
    const bytes = await readGeneratedFileBytesForTest(id);
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.ok(!bytes.includes(Buffer.from("PRIVATE_NAME_SENTINEL")));
  } finally {
    const { removeFile } = await import("@/shared/files");
    await removeFile(`generated/${tag}-pdf.bin`).catch(() => undefined);
    await db.generatedFile.deleteMany({ where: { ownerId: user.id } });
    await db.user.deleteMany({ where: { id: user.id } });
  }
});

test("db: worker — eşleşmeyen yürütme reddedilir; yetki hatası kalıcı (yeniden denenmez)", { skip: !enabled }, async () => {
  const { runWeeklyReport, failWeeklyReportAttempt } = await import("@/modules/secretary/services/weekly-report-runner");
  const context = { executionId: "exec-x", organizationId: "default", leaseToken: 1, locale: "tr" as const, signal: new AbortController().signal };
  await assert.rejects(() => runWeeklyReport("wr-does-not-exist", context), /SECRETARY_REPORT_EXECUTION_MISMATCH/);
  await assert.rejects(() => failWeeklyReportAttempt("wr-does-not-exist", { ...context, attempt: 1 }, new Error("SECRETARY_REPORT_FORBIDDEN"), 2), (error: unknown) => (error as { permanent?: boolean }).permanent === true);
  await assert.rejects(() => failWeeklyReportAttempt("wr-does-not-exist", { ...context, attempt: 1 }, new Error("EXPORT_RENDER_FAILED"), 2), (error: unknown) => (error as { permanent?: boolean }).permanent !== true);
  await assert.rejects(() => failWeeklyReportAttempt("wr-does-not-exist", { ...context, attempt: 2 }, new Error("EXPORT_RENDER_FAILED"), 2), (error: unknown) => (error as { permanent?: boolean }).permanent === true);
});
