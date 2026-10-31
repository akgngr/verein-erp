import "server-only";

import { z } from "zod";

import { DATE_RE, PROPOSED, aiAction, aiTool, defineModuleAi, isoDay } from "@/shared/ai/define";
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

export const ai = defineModuleAi({
  module: "documents",
  tools: [
    aiTool({
      name: "get_document_statistics",
      operation: "read",
      allowed: (user) => can(user.role, documentsPermissions, "view"),
      description: "Correspondence register statistics: open, in progress, overdue, incoming and outgoing this month. Counts only.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      run: async () => getDocumentStats(),
    }),
    aiTool({
      name: "list_documents",
      operation: "read",
      allowed: (user) => can(user.role, documentsPermissions, "view"),
      description: "Search the correspondence register (incoming/outgoing letters). Returns id, registry number, dates, counterparty, subject, status, category and file count. Optional free-text query and filters.", // i18n-ignore (model-facing tool text)
      schema: z.object({ query: z.string().max(100).nullable(), status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]).nullable(), direction: z.enum(["INCOMING", "OUTGOING"]).nullable() }),
      inputSchema: {
        type: "object",
        properties: {
          query: { type: ["string", "null"] },
          status: { type: ["string", "null"], enum: ["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED", null] },
          direction: { type: ["string", "null"], enum: ["INCOMING", "OUTGOING", null] },
        },
        required: ["query", "status", "direction"],
        additionalProperties: false,
      },
      run: async ({ query, status, direction }, { user }) => {
        const params = parseListParams(
          { pageSize: "50", ...(query ? { q: query } : {}), ...(status ? { status } : {}), ...(direction ? { direction } : {}) },
          { sortableFields: DOCUMENT_SORTABLE_FIELDS, defaultSort: DOCUMENT_DEFAULT_SORT, defaultDir: "desc", filterKeys: ["direction", "status", "categoryId", "assigneeId", "from", "to", "mine", "overdue"] },
        );
        const result = await listDocuments(params, user.id);
        return {
          total: result.total,
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
    }),
    aiTool({
      name: "get_document",
      operation: "read",
      allowed: (user) => can(user.role, documentsPermissions, "view"),
      description: "Details of one document: subject, summary, dates, status, category, reply chain and attached files (id, name, type). Use read_document_file to read an attachment.", // i18n-ignore (model-facing tool text)
      schema: z.object({ documentId: z.string().min(1).max(100) }),
      inputSchema: { type: "object", properties: { documentId: { type: "string" } }, required: ["documentId"], additionalProperties: false },
      run: async ({ documentId }) => {
        const doc = await getDocumentDetail(documentId);
        if (!doc) return { status: "not_found" };
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
    }),
    aiTool({
      name: "read_document_file",
      operation: "read",
      allowed: (user) => can(user.role, documentsPermissions, "view"),
      description: "Reads the text of an attached file (PDF with text layer, Word .docx, Excel .xlsx) so you can summarise it or answer questions. Scanned PDFs and images have no text. Personal identifiers in the text are masked.", // i18n-ignore (model-facing tool text)
      schema: z.object({ fileId: z.string().min(1).max(100) }),
      inputSchema: { type: "object", properties: { fileId: { type: "string" } }, required: ["fileId"], additionalProperties: false },
      run: async ({ fileId }) => {
        const file = await getDocumentFileText(fileId);
        if (!file) return { status: "not_found" };
        return { name: file.originalName, mimeType: file.mimeType, text: file.text, truncated: file.truncated, unavailableReason: file.reason ?? null };
      },
    }),
    aiTool({
      name: "propose_document",
      operation: "create",
      allowed: (user) => can(user.role, documentsPermissions, "create"),
      description: "PROPOSES registering a new incoming or outgoing document. Dates YYYY-MM-DD. Nothing is created until the user confirms.", // i18n-ignore (model-facing tool text)
      schema: z.object({
        direction: z.enum(["INCOMING", "OUTGOING"]),
        documentDate: z.string().regex(DATE_RE),
        counterparty: z.string().min(2).max(200),
        subject: z.string().min(3).max(300),
        summary: z.string().max(2000).nullable(),
        dueDate: z.string().regex(DATE_RE).nullable(),
      }),
      inputSchema: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["INCOMING", "OUTGOING"] },
          documentDate: { type: "string" },
          counterparty: { type: "string" },
          subject: { type: "string" },
          summary: { type: ["string", "null"] },
          dueDate: { type: ["string", "null"] },
        },
        required: ["direction", "documentDate", "counterparty", "subject", "summary", "dueDate"],
        additionalProperties: false,
      },
      run: async ({ subject, ...rest }, { propose }) => {
        propose({ action: "create", title: subject, details: [rest.direction, rest.documentDate, rest.counterparty], payload: { subject, ...rest } });
        return PROPOSED;
      },
    }),
    aiTool({
      name: "propose_document_status",
      operation: "update",
      allowed: (user) => can(user.role, documentsPermissions, "update"),
      description: "PROPOSES changing a document's status (id from list_documents).", // i18n-ignore (model-facing tool text)
      schema: z.object({ documentId: z.string().min(1).max(100), status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]) }),
      inputSchema: {
        type: "object",
        properties: { documentId: { type: "string" }, status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"] } },
        required: ["documentId", "status"],
        additionalProperties: false,
      },
      run: async ({ documentId, status }, { propose }) => {
        const doc = await getDocumentDetail(documentId);
        if (!doc) return { status: "not_found" };
        propose({ action: "changeStatus", title: `${doc.registryNumber} – ${doc.subject}`, details: [`→ ${status}`], payload: { documentId: doc.id, status } });
        return PROPOSED;
      },
    }),
    aiTool({
      name: "propose_delete_document",
      operation: "delete",
      allowed: (user) => can(user.role, documentsPermissions, "delete"),
      description: "PROPOSES deleting a document (id from list_documents).", // i18n-ignore (model-facing tool text)
      schema: z.object({ documentId: z.string().min(1).max(100) }),
      inputSchema: { type: "object", properties: { documentId: { type: "string" } }, required: ["documentId"], additionalProperties: false },
      run: async ({ documentId }, { propose }) => {
        const doc = await getDocumentDetail(documentId);
        if (!doc) return { status: "not_found" };
        propose({ action: "delete", title: `${doc.registryNumber} – ${doc.subject}`, payload: { documentId: doc.id } });
        return PROPOSED;
      },
    }),
  ],
  actions: {
    create: aiAction({ operation: "create", schema: createSchema, execute: (input) => createDocumentAction(input) }),
    changeStatus: aiAction({
      operation: "update",
      schema: z.object({ documentId: z.string().min(1).max(100), status: STATUS }),
      execute: ({ documentId, status }) => changeStatusAction({ id: documentId, status }),
    }),
    delete: aiAction({ operation: "delete", schema: z.object({ documentId: z.string().min(1).max(100) }), execute: ({ documentId }) => deleteDocumentAction({ id: documentId }) }),
  },
});
