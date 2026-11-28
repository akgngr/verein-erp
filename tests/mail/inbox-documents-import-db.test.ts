import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { test } from "node:test";

import { createDocumentWithFiles } from "@/modules/documents/services/programmatic-document";
import { importMessageToDocumentsWith } from "@/modules/mail/services/inbox-documents";
import { getDb } from "@/shared/db";
import { removeFile, saveFile } from "@/shared/files";
import { resolveSafePath } from "@/shared/files/storage";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.AI_TEST_DATABASE_URL !== process.env.DATABASE_URL) throw new Error("Use an isolated database");

const actor = { id: "synthetic-actor", label: "SYNTHETIC" };
const importMessageToDocuments = (messageId: string, by: typeof actor) => importMessageToDocumentsWith({ createDocumentWithFiles }, messageId, by);
const pdf = Buffer.from("%PDF-1.4\n%synthetic\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

async function createMessage(tag: string, dir: string, attachments: Array<{ name: string; missing?: boolean; importedTo?: string }>) {
  const db = getDb();
  const message = await db.mailInboxMessage.create({
    data: { source: "EML", externalKey: `${tag}-${randomUUID()}`, subject: `Synthetic ${tag}`, receivedAt: new Date("2099-02-01T10:00:00Z"), fromAddress: "sender@example.org" },
  });
  for (const item of attachments) {
    const storagePath = ["mail", "inbox", "test", dir, `${message.id}-${item.name}`].join("/");
    if (!item.missing) await saveFile(storagePath, pdf);
    await db.mailInboxAttachment.create({
      data: { messageId: message.id, fileName: item.name, mimeType: "application/pdf", extension: "pdf", size: pdf.length, storagePath, importedTo: item.importedTo ?? null, importedAt: item.importedTo ? new Date() : null },
    });
  }
  return message.id;
}

async function cleanup(messageIds: string[]) {
  const db = getDb();
  const messages = await db.mailInboxMessage.findMany({ where: { id: { in: messageIds } }, select: { importedDocumentId: true } });
  const documentIds = messages.flatMap((m) => (m.importedDocumentId ? [m.importedDocumentId] : []));
  const files = await db.documentFile.findMany({ where: { documentId: { in: documentIds } }, select: { storagePath: true } });
  for (const file of files) await removeFile(file.storagePath).catch(() => undefined);
  await db.documentFile.deleteMany({ where: { documentId: { in: documentIds } } });
  await db.document.deleteMany({ where: { id: { in: documentIds } } });
  const attachments = await db.mailInboxAttachment.findMany({ where: { messageId: { in: messageIds } }, select: { storagePath: true } });
  for (const attachment of attachments) await removeFile(attachment.storagePath).catch(() => undefined);
  await db.mailInboxMessage.deleteMany({ where: { id: { in: messageIds } } });
}

test("mail → documents marks only archived attachments and keeps the message open while files were skipped", { skip: !enabled }, async () => {
  const dir = randomUUID().slice(0, 8);
  const tag = `imp-${randomUUID().slice(0, 8)}`;
  const names = Array.from({ length: 12 }, (_, i) => ({ name: `file-${String(i).padStart(2, "0")}.pdf` }));
  const messageId = await createMessage(tag, dir, [{ name: "lost.pdf", missing: true }, ...names]);
  try {
    const result = await importMessageToDocuments(messageId, actor);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.totalCount, 13);
    assert.equal(result.attachedCount, 10, "MAX_FILES_PER_DOCUMENT caps the archive");
    assert.equal(result.skippedCount, 3, "one unreadable file and two over the cap");

    const db = getDb();
    const attachments = await db.mailInboxAttachment.findMany({ where: { messageId }, orderBy: { fileName: "asc" } });
    const marked = attachments.filter((a) => a.importedTo === `documents.document:${result.documentId}`);
    assert.equal(marked.length, 10);
    assert.deepEqual(attachments.filter((a) => a.importedTo === null).map((a) => a.fileName).sort(), ["file-10.pdf", "file-11.pdf", "lost.pdf"]);
    assert.equal(await db.documentFile.count({ where: { documentId: result.documentId } }), 10);

    const message = await db.mailInboxMessage.findUniqueOrThrow({ where: { id: messageId } });
    assert.equal(message.importedDocumentId, result.documentId);
    assert.equal(message.documentImportStartedAt, null);
    assert.equal(message.status, "NEW", "skipped attachments keep the message open");

    const again = await importMessageToDocuments(messageId, actor);
    assert.deepEqual(again, { ok: false, reason: "duplicate", documentId: result.documentId });
  } finally {
    await cleanup([messageId]);
  }
});

test("mail → documents links the message even without document attachments, so a second transfer is a duplicate", { skip: !enabled }, async () => {
  const dir = randomUUID().slice(0, 8);
  const tag = `imp-${randomUUID().slice(0, 8)}`;
  const bare = await createMessage(tag, dir, []);
  const allAccounting = await createMessage(tag, dir, [{ name: "invoice.pdf", importedTo: "accounting.payable:synthetic" }]);
  try {
    for (const messageId of [bare, allAccounting]) {
      const first = await importMessageToDocuments(messageId, actor);
      assert.equal(first.ok, true);
      if (!first.ok) return;
      const message = await getDb().mailInboxMessage.findUniqueOrThrow({ where: { id: messageId }, include: { attachments: true } });
      assert.equal(message.importedDocumentId, first.documentId);
      assert.equal(message.status, "DONE");
      assert.ok(message.attachments.every((a) => a.importedTo === "accounting.payable:synthetic"), "accounting marker is kept");
      const second = await importMessageToDocuments(messageId, actor);
      assert.deepEqual(second, { ok: false, reason: "duplicate", documentId: first.documentId });
    }
  } finally {
    await cleanup([bare, allAccounting]);
  }
});

test("two concurrent transfers of one message create exactly one registry entry", { skip: !enabled }, async () => {
  const dir = randomUUID().slice(0, 8);
  const tag = `imp-${randomUUID().slice(0, 8)}`;
  const messageId = await createMessage(tag, dir, [{ name: "letter.pdf" }]);
  try {
    const results = await Promise.all([importMessageToDocuments(messageId, actor), importMessageToDocuments(messageId, actor)]);
    const created = results.filter((r) => r.ok);
    assert.equal(created.length, 1);
    const other = results.find((r) => !r.ok);
    assert.ok(other && !other.ok && (other.reason === "inProgress" || other.reason === "duplicate"));
    const subjects = await getDb().document.count({ where: { subject: `Synthetic ${tag}` } });
    assert.equal(subjects, 1);
  } finally {
    await cleanup([messageId]);
  }
});

test("a transfer that fails after the register entry was committed stays linked, so a retry is a duplicate", { skip: !enabled }, async () => {
  const dir = randomUUID().slice(0, 8);
  const tag = `imp-${randomUUID().slice(0, 8)}`;
  const messageId = await createMessage(tag, dir, [{ name: "letter.pdf" }]);
  try {
    const committedThenFailed: typeof createDocumentWithFiles = async (input) => {
      await input.onDocumentCreated?.({ id: `${tag}-committed`, registryNumber: "GLN-2099-0001" });
      throw new Error("disk full");
    };
    await assert.rejects(importMessageToDocumentsWith({ createDocumentWithFiles: committedThenFailed }, messageId, actor), /disk full/);
    const message = await getDb().mailInboxMessage.findUniqueOrThrow({ where: { id: messageId } });
    assert.equal(message.importedDocumentId, `${tag}-committed`);
    assert.equal(message.documentImportStartedAt, null, "claim released");
    assert.deepEqual(await importMessageToDocuments(messageId, actor), { ok: false, reason: "duplicate", documentId: `${tag}-committed` });
  } finally {
    await cleanup([messageId]);
  }
});

test.after(async () => {
  if (!enabled) return;
  await rm(resolveSafePath("mail/inbox/test"), { recursive: true, force: true });
  await getDb().$disconnect();
});
