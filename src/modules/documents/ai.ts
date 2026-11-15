import "server-only";
import { aiToolV2, defineModuleAiV2 } from "@/shared/ai/v2";
import {aiProposalTools} from "./services/ai-proposal-tools";

import { z } from "zod";
import {aiListCursor,aiListPage,aiPageInfo} from "@/shared/ai/pagination";

import {DATE_RE, aiAction, isoDay} from "@/shared/ai/define";
import { parseListParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { documentsPermissions } from "./permissions";
import { changeStatusAction, createDocumentAction, deleteDocumentAction, DOCUMENT_DEFAULT_SORT, DOCUMENT_SORTABLE_FIELDS, getDocumentDetail, getDocumentFileText, getDocumentStats, listDocuments } from "./server";

/** Evrak: sorumlu kişi dönmez; karşı taraf ve ek içerikleri maskeleme katmanından geçer. Sözleşme: src/shared/ai/define.ts. */
const STATUS = z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]);
const createSchema = z.object({
  direction: z.enum(["INCOMING", "OUTGOING"]),
  documentDate: z.string().regex(DATE_RE),
  counterparty: z.string().min(2).max(200),
  subject: z.string().min(3).max(300),
  summary: z.string().max(2000).nullable(),
  dueDate: z.string().regex(DATE_RE).nullable(),
});

export const ai = defineModuleAiV2({
  module: "documents",
  tools: [
    aiToolV2({
      name: "get_document_statistics",
      operation: "read",
      allowed: (user) => can(user.role, documentsPermissions, "view"),
      description: "Correspondence register statistics: open, in progress, overdue, incoming and outgoing this month. Counts only.", // i18n-ignore (model-facing tool text)
      input: z.object({}),
      run: async () => getDocumentStats(),
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "documents-get-document-statistics", "serverReads": ["Document", "DocumentCategory"], "modelFields": ["open", "inProgress", "overdue", "incomingThisMonth", "outgoingThisMonth"], "processing": "approved_provider", "modelDataClass": "aggregate"},
    }),
    aiToolV2({
      name: "list_documents",
      requiresContent:true,
      operation: "read",
      allowed: (user) => can(user.role, documentsPermissions, "view"),
      description: "Search the correspondence register (incoming/outgoing letters). Returns id, registry number, dates, counterparty, subject, status, category and file count. Optional free-text query and filters.", // i18n-ignore (model-facing tool text)
      input: z.object({ cursor:aiListCursor, query: z.string().max(100).nullable(), status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]).nullable(), direction: z.enum(["INCOMING", "OUTGOING"]).nullable() }),
      run: async ({ cursor, query, status, direction }, { user }) => {
        const params = parseListParams(
          { page:String(aiListPage(cursor)),pageSize: "50", ...(query ? { q: query } : {}), ...(status ? { "filter.status":status } : {}), ...(direction ? { "filter.direction":direction } : {}) },
          { sortableFields: DOCUMENT_SORTABLE_FIELDS, defaultSort: DOCUMENT_DEFAULT_SORT, defaultDir: "desc", filterKeys: ["direction", "status", "categoryId", "assigneeId", "from", "to", "mine", "overdue"] },
        );
        const result = await listDocuments(params, user.id);
        return {
          ...aiPageInfo(result.page,result.pageSize,result.total),
          documents: result.rows.map((row) => ({
            id: row.id,
            registryNumber: row.registryNumber,
            direction: row.direction,
            documentDate: isoDay(row.documentDate),
            counterparty: row.counterparty,
            subject: row.subject,
            status: row.status,
            dueDate: isoDay(row.dueDate),
            overdue: row.isOverdue,
            category: row.categoryName,
            fileCount: row.fileCount,
          })),
        };
      },
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "documents-list-documents", "serverReads": ["Document", "DocumentCategory"], "modelFields": ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "documents", "documents.id", "documents.registryNumber", "documents.direction", "documents.documentDate", "documents.counterparty", "documents.subject", "documents.status", "documents.dueDate", "documents.overdue", "documents.category", "documents.fileCount"], "processing": "local_only"},
    }),
    aiToolV2({
      name: "get_document",
      requiresContent:true,
      operation: "read",
      allowed: (user) => can(user.role, documentsPermissions, "view"),
      description: "Details of one document: subject, summary, dates, status, category, reply chain and attached files (id, name, type). Use read_document_file to read an attachment.", // i18n-ignore (model-facing tool text)
      input: z.object({ documentId: z.string().min(1).max(100) }),
      run: async ({ documentId }) => {
        const doc = await getDocumentDetail(documentId);
        if (!doc) return { status: "not_found" } as const;
        return {
          id: doc.id,
          registryNumber: doc.registryNumber,
          direction: doc.direction,
          documentDate: isoDay(doc.documentDate),
          counterparty: doc.counterparty,
          referenceNumber: doc.referenceNumber,
          subject: doc.subject,
          summary: doc.summary,
          status: doc.status,
          dueDate: isoDay(doc.dueDate),
          category: doc.categoryName,
          replyTo: doc.replyTo ? { registryNumber: doc.replyTo.registryNumber, subject: doc.replyTo.subject } : null,
          files: doc.files.map((file) => ({ id: file.id, name: file.originalName, mimeType: file.mimeType })),
        };
      },
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "documents-get-document", "serverReads": ["Document", "DocumentCategory", "DocumentFile"], "modelFields": ["status", "id", "registryNumber", "direction", "documentDate", "counterparty", "referenceNumber", "subject", "summary", "dueDate", "category", "replyTo", "replyTo.registryNumber", "replyTo.subject", "files", "files.id", "files.name", "files.mimeType"], "processing": "local_only"},
    }),
    aiToolV2({
      name: "read_document_file",
      requiresContent:true,
      operation: "read",
      allowed: (user) => can(user.role, documentsPermissions, "view"),
      description: "Reads the text of an attached file (PDF with text layer, Word .docx, Excel .xlsx) so you can summarise it or answer questions. Scanned PDFs and images have no text. Personal identifiers in the text are masked.", // i18n-ignore (model-facing tool text)
      input: z.object({ fileId: z.string().min(1).max(100) }),
      run: async ({ fileId }) => {
        const file = await getDocumentFileText(fileId);
        if (!file) return { status: "not_found" } as const;
        return { name: file.originalName, mimeType: file.mimeType, text: file.text, truncated: file.truncated, unavailableReason: file.reason ?? null };
      },
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "documents-read-document-file", "serverReads": ["DocumentFile"], "modelFields": ["status", "name", "mimeType", "text", "truncated", "unavailableReason"], "processing": "local_only"},
    }),
    ...aiProposalTools,

  ],
  actions: {
    create: aiAction({ operation: "create", schema: createSchema, execute: (input) => createDocumentAction(input) }),
    changeStatus: aiAction({
      operation: "update",
      snapshot: (input)=>getDocumentDetail(input.documentId),
      schema: z.object({ documentId: z.string().min(1).max(100), status: STATUS }),
      execute: ({ documentId, status }) => changeStatusAction({ id: documentId, status }),
    }),
    delete: aiAction({ operation: "delete", snapshot: (input)=>getDocumentDetail(input.documentId), schema: z.object({ documentId: z.string().min(1).max(100) }), execute: ({ documentId }) => deleteDocumentAction({ id: documentId }) }),
  },
});
