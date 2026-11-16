import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {proposalAcknowledgementSchema} from "@/shared/ai/dataset";
import {DATE_RE,PROPOSED} from "@/shared/ai/define";
import {can} from "@/shared/permissions/define";
import {documentsPermissions} from "../permissions";
import {getAiDocumentTarget} from "../queries/ai-target";

/** Server-only proposal definitions; domain actions are invoked only by explicit confirmation. */
export const aiProposalTools=[
aiToolV2({
      name: "propose_document",
      operation: "create",
      allowed: (user) => can(user.role, documentsPermissions, "create"),
      description: "PROPOSES registering a new incoming or outgoing document. Dates YYYY-MM-DD. Nothing is created until the user confirms.", // i18n-ignore (model-facing tool text)
      input:(z.object({
        direction: z.enum(["INCOMING", "OUTGOING"]),
        documentDate: z.string().regex(DATE_RE),
        counterparty: z.string().min(2).max(200),
        subject: z.string().min(3).max(300),
        summary: z.string().max(2000).nullable(),
        dueDate: z.string().regex(DATE_RE).nullable(),
      })).strict(),
      result:proposalAcknowledgementSchema,modelOutput:proposalAcknowledgementSchema,
      policy:{"purpose":"documents-proposal","serverReads":[],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async ({ subject, ...rest }, { propose }) => {
        propose({ action: "create", title: subject, details: [rest.direction, rest.documentDate, rest.counterparty], payload: { subject, ...rest } });
        return PROPOSED;
      },
    }),
aiToolV2({
      name: "propose_document_status",
      operation: "update",
      allowed: (user) => can(user.role, documentsPermissions, "update"),
      description: "PROPOSES changing a document's status (id from list_documents).", // i18n-ignore (model-facing tool text)
      input:(z.object({ documentId: z.string().min(1).max(100), status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]) })).strict(),
      result:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),modelOutput:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),
      policy:{"purpose":"documents-proposal","serverReads":["Document"],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async ({ documentId, status }, { propose }) => {
        const doc = await getAiDocumentTarget(documentId);
        if (!doc) return { status: "not_found" } as const;
        propose({ action: "changeStatus", title: `${doc.registryNumber} – ${doc.subject}`, details: [`→ ${status}`], payload: { documentId: doc.id, status } });
        return PROPOSED;
      },
    }),
aiToolV2({
      name: "propose_delete_document",
      operation: "delete",
      allowed: (user) => can(user.role, documentsPermissions, "delete"),
      description: "PROPOSES deleting a document (id from list_documents).", // i18n-ignore (model-facing tool text)
      input:(z.object({ documentId: z.string().min(1).max(100) })).strict(),
      result:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),modelOutput:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),
      policy:{"purpose":"documents-proposal","serverReads":["Document"],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async ({ documentId }, { propose }) => {
        const doc = await getAiDocumentTarget(documentId);
        if (!doc) return { status: "not_found" } as const;
        propose({ action: "delete", title: `${doc.registryNumber} – ${doc.subject}`, payload: { documentId: doc.id } });
        return PROPOSED;
      },
    })
];
