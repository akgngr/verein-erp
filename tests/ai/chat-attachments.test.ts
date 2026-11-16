import test from "node:test";
import assert from "node:assert/strict";

import { groupConversations } from "@/modules/ai/lib/history-groups";

process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret-123";

test("ek mührü: yalnız aynı kullanıcı ve süresi içinde açılır; istemci metni göremez", async () => {
  const { openAttachment, sealAttachment, AI_ATTACHMENT_TTL_MS } = await import("@/modules/ai/services/attachments");
  const now = Date.UTC(2026, 10, 16, 10);
  const token = sealAttachment("user-1", { name: "fatura.pdf", source: "text", truncated: false, text: "Gizli içerik Zyxw" }, now);
  assert.doesNotMatch(token, /Zyxw|fatura/);
  assert.equal(openAttachment("user-1", token, now)?.text, "Gizli içerik Zyxw");
  assert.equal(openAttachment("user-2", token, now), null);
  assert.equal(openAttachment("user-1", token, now + AI_ATTACHMENT_TTL_MS + 1), null);
  assert.equal(openAttachment("user-1", token.slice(0, -4) + "AAAA", now), null);
});

test("ek bloğu: toplam sınır uygulanır, ad temizlenir, kesilen ek işaretlenir", async () => {
  const { attachmentBlock, AI_ATTACHMENT_TOTAL_CHARS } = await import("@/modules/ai/services/attachments");
  const block = attachmentBlock([
    { name: 'a"><x.pdf', source: "ocr", truncated: false, text: "x".repeat(AI_ATTACHMENT_TOTAL_CHARS) },
    { name: "b.md", source: "text", truncated: false, text: "ikinci" },
  ]);
  assert.match(block, /<attachment name="ax\.pdf" extracted_by="ocr">/);
  assert.match(block, /<attachment name="b\.md" extracted_by="text" truncated="true">\n\n<\/attachment>/);
});

test("sohbet geçmişi: bugün/dün/7 gün/30 gün/daha eski gruplanır, boş grup atlanır", () => {
  const now = new Date(2026, 10, 16, 12);
  const at = (days: number) => new Date(2026, 10, 16 - days, 9).toISOString();
  const groups = groupConversations([{ id: "a", updatedAt: at(0) }, { id: "b", updatedAt: at(1) }, { id: "c", updatedAt: at(3) }, { id: "d", updatedAt: at(40) }], now);
  assert.deepEqual(groups.map((group) => [group.key, group.items.map((item) => item.id)]), [["today", ["a"]], ["yesterday", ["b"]], ["week", ["c"]], ["older", ["d"]]]);
});

test("ek metni: Markdown ve CSV düz metin olarak okunur; desteklenmeyen tür reddedilir", async () => {
  const { extractAttachmentText } = await import("@/shared/files/attachment-text");
  const md = await extractAttachmentText(new TextEncoder().encode("# Rapor\n\nBu yılın gelir ve gider özeti burada yer alıyor."), "text/plain", "md");
  assert.equal(md.text?.startsWith("# Rapor"), true);
  const csv = await extractAttachmentText(new TextEncoder().encode("ad;tutar\nkira;1200\nelektrik;150\nsu;80"), "application/vnd.ms-excel", "csv");
  assert.match(csv.text ?? "", /kira;1200/);
  const bin = await extractAttachmentText(new Uint8Array([0, 1, 2]), "application/octet-stream", "bin");
  assert.equal(bin.text, null);
});

test("geçici yükleme: şifreli saklanır, yalnız sahibi ve süresi içinde açılır, silinebilir", async () => {
  const os = await import("node:os");
  const fs = await import("node:fs/promises");
  const pathModule = await import("node:path");
  const dir = await fs.mkdtemp(pathModule.join(os.tmpdir(), "temp-upload-"));
  process.env.UPLOAD_DIR = dir;
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  const { saveTempUpload, readTempUpload, deleteTempUpload, TEMP_UPLOAD_TTL_MS } = await import("@/shared/files/temp-uploads");
  try {
    const now = Date.now();
    const bytes = new TextEncoder().encode("%PDF-1.4 Zyxwsentinel");
    const ref = await saveTempUpload("user-1", bytes, { originalName: "Ahmet Yılmaz fatura.pdf", mimeType: "application/pdf", extension: "pdf", size: bytes.length }, now);
    const { getUploadRoot } = await import("@/shared/files/storage");
    const stored = await fs.readFile(pathModule.join(getUploadRoot(), ".tmp", "uploads", `${ref}.bin`));
    assert.equal(stored.includes(Buffer.from("Zyxwsentinel")), false);
    assert.equal(stored.includes(Buffer.from("Ahmet")), false);
    const opened = await readTempUpload("user-1", ref, now);
    assert.equal(opened?.data.toString(), "%PDF-1.4 Zyxwsentinel");
    assert.equal(opened?.meta.originalName, "Ahmet Yılmaz fatura.pdf");
    assert.equal(await readTempUpload("user-2", ref, now), null);
    assert.equal(await readTempUpload("user-1", ref, now + TEMP_UPLOAD_TTL_MS + 1), null);
    assert.equal(await readTempUpload("user-1", "../../etc/passwd", now), null);
    await deleteTempUpload(ref);
    assert.equal(await readTempUpload("user-1", ref, now), null);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
