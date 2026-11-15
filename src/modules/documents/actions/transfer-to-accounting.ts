"use server";

import path from "node:path";

import { z } from "zod";

import { getDb } from "@/shared/db";
import { readFile } from "@/shared/files";
import { can } from "@/shared/permissions/define";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { accountingPermissions, importPayableFile } from "@/modules/accounting/server";
import { ActionError, createAction } from "@/modules/auth/server";
import { listUsableModuleKeys } from "@/modules/system/server";

import { documentsPermissions } from "../permissions";
import { analyzeDocumentBytes } from "../services/document-analysis";

/**
 * "Muhasebeye aktar" (docs/specs/DOCUMENTS_AI.md, EV-3): gelen evrak dosyası, muhasebenin bildirilmiş
 * sunucu API'si üzerinden gelen fatura TASLAĞI olarak açılır (module.config.ts → access: accounting write).
 * Kapılar: evrak görüntüleme yetkisi, muhasebe modülü kullanılabilir ve kullanıcının muhasebe oluşturma yetkisi.
 * Tutar KDV dağılımı bilinmediği için notta kalır; kategori ve kesinleştirme muhasebede kullanıcıya aittir.
 */
export async function transferToAccountingAction(input: unknown): Promise<ActionResult<{ payableId: string; duplicate: boolean }>> {
  const run = createAction({
    permission: { definition: documentsPermissions, action: "view" },
    schema: z.object({ fileId: z.string().min(1).max(64) }).strict(),
    handler: async ({ input, user, audit }) => {
      if (!(await listUsableModuleKeys()).includes("accounting") || !can(user.role, accountingPermissions, "create")) {
        throw new ActionError("documents.actions.transferNotAllowed");
      }
      const file = await getDb().documentFile.findFirst({
        where: { id: input.fileId, deletedAt: null, document: { deletedAt: null, direction: "INCOMING" } },
        select: { originalName: true, mimeType: true, size: true, storagePath: true, document: { select: { id: true, registryNumber: true, counterparty: true } } },
      });
      if (!file) throw new ActionError("documents.errors.documentNotFound");

      const buffer = await readFile(file.storagePath);
      const { suggestions: s } = await analyzeDocumentBytes(buffer, file.mimeType).catch(() => ({ suggestions: {} as Awaited<ReturnType<typeof analyzeDocumentBytes>>["suggestions"] }));
      const amount = s.amountCents ? (s.amountCents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—";
      const result = await importPayableFile({
        buffer,
        originalName: file.originalName,
        extension: path.extname(file.originalName).slice(1).toLowerCase(),
        mimeType: file.mimeType,
        size: file.size,
        actor: { id: user.id, label: buildUserLabel(user.name, user.email) },
        channel: "document",
        prefill: {
          supplierName: (s.counterparty ?? file.document.counterparty).slice(0, 150) || undefined,
          number: s.referenceNumber,
          issueDate: s.documentDate,
          dueDate: s.dueDate,
          iban: s.iban,
          // Metin muhasebe kaydına yazılır (kullanıcı dili değil; denetim için evrak numarasıyla).
          notes: `Evrak ${file.document.registryNumber} · ${amount}`, // i18n-ignore (stored note, not UI text)
        },
      });
      await audit({ action: "DOCUMENT_TO_ACCOUNTING", entity: "Document", entityId: file.document.id, after: { registryNumber: file.document.registryNumber, payableId: result.id, duplicate: !result.ok } });
      return { payableId: result.id, duplicate: !result.ok };
    },
  });
  return run(input);
}
