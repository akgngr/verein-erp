"use server";

import { z } from "zod";

import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";
import { createCourseAction, deleteCourseAction, getCourse, updateCourseAction } from "@/modules/courses/server";
import { changeStatusAction as changeDocumentStatusAction, createDocumentAction, deleteDocumentAction } from "@/modules/documents/server";
import { createEventAction } from "@/modules/events/server";
import { createInventoryAction, deleteInventoryAction, updateInventoryStatusAction } from "@/modules/inventory/server";
import { changeMeetingStatusAction, createMeetingAction, deleteMeetingAction } from "@/modules/meetings/server";
import { moduleAiRegistry } from "@/ai-registry";

import { aiPermissions } from "../permissions";
import { getAiPermissions, isAllowed, type AiOperation } from "../services/permissions";
import { PROPOSAL_PERMISSION } from "../services/tools";
import type { AiProposal } from "../types";

const id = z.string().min(1).max(100);
const title = z.string().max(400);
const proposalSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("module"), module: id, action: id, operation: z.enum(["read", "create", "update", "delete"]), title, details: z.array(z.string().max(400)).max(10), payload: z.unknown() }),
  z.object({
    kind: z.literal("createEvent"),
    title: z.string().min(3).max(200),
    description: z.string().max(2000).nullable(),
    type: z.enum(["WORKSHOP", "SEMINAR", "SOCIAL", "CULTURAL", "SPORTS", "OTHER"]),
    startDate: z.string(),
    endDate: z.string().nullable(),
    location: z.string().max(200).nullable(),
    isOnline: z.boolean(),
  }),
  z.object({ kind: z.literal("createDocument"), title, direction: z.enum(["INCOMING", "OUTGOING"]), documentDate: z.string(), counterparty: z.string().max(200), summary: z.string().max(2000).nullable(), dueDate: z.string().nullable() }),
  z.object({ kind: z.literal("changeDocumentStatus"), documentId: id, title, status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]) }),
  z.object({ kind: z.literal("deleteDocument"), documentId: id, title }),
  z.object({ kind: z.literal("createMeeting"), title, type: z.enum(["BOARD", "GENERAL_ASSEMBLY", "COMMITTEE", "OTHER"]), meetingDate: z.string(), startTime: z.string().nullable(), location: z.string().max(200).nullable(), description: z.string().max(2000).nullable() }),
  z.object({ kind: z.literal("changeMeetingStatus"), meetingId: id, title, status: z.enum(["PLANNED", "HELD", "APPROVED", "CANCELLED"]), reason: z.string().max(500).nullable() }),
  z.object({ kind: z.literal("deleteMeeting"), meetingId: id, title }),
  z.object({ kind: z.literal("createInventory"), title, category: z.enum(["ELECTRONICS", "FURNITURE", "KITCHEN", "OFFICE", "SPORTS", "OTHER"]), quantity: z.number().int(), status: z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]), location: z.string().max(200).nullable(), description: z.string().max(2000).nullable() }),
  z.object({ kind: z.literal("changeInventoryStatus"), itemId: id, title, status: z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]) }),
  z.object({ kind: z.literal("deleteInventory"), itemId: id, title }),
  z.object({ kind: z.literal("createCourse"), title, courseKind: z.enum(["COURSE", "TUTORING"]), subject: z.string().max(80).nullable(), startDate: z.string(), endDate: z.string().nullable(), description: z.string().max(2000).nullable() }),
  z.object({ kind: z.literal("changeCourseStatus"), courseId: id, title, status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]) }),
  z.object({ kind: z.literal("deleteCourse"), courseId: id, title }),
]);

const findModuleAction = (module: string, action: string) =>
  moduleAiRegistry.find((entry) => entry.module === module)?.actions[action];

/** Önerinin izin matrisi anahtarı: modül önerilerinde işlem, modülün eylem tanımından okunur. */
function requiredPermission(proposal: AiProposal): { module: string; operation: AiOperation } | null {
  if (proposal.kind !== "module") return PROPOSAL_PERMISSION[proposal.kind];
  const action = findModuleAction(proposal.module, proposal.action);
  return action ? { module: proposal.module, operation: action.operation } : null;
}

type Outcome = { ok: boolean; error?: string };
const isoDay = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "");

/** Modül eylemini çağırır; her modül eylemi kullanıcının KENDİ rol yetkisini ayrıca denetler. */
async function apply(proposal: AiProposal): Promise<Outcome> {
  switch (proposal.kind) {
    case "module": {
      // İşlem türü istemciden değil, modülün kendi eylem tanımından gelir (sahteciliğe karşı).
      const action = findModuleAction(proposal.module, proposal.action);
      if (!action) return { ok: false, error: "common.errors.unexpected" };
      const payload = action.schema.safeParse(proposal.payload);
      if (!payload.success) return { ok: false, error: "common.errors.formInvalid" };
      return action.execute(payload.data);
    }
    case "createEvent": {
      const created = await createEventAction({ title: proposal.title, description: proposal.description, type: proposal.type, status: "DRAFT", startDate: proposal.startDate, endDate: proposal.endDate, location: proposal.location, isOnline: proposal.isOnline });
      return { ok: created.success, error: created.error ?? undefined };
    }
    case "createDocument":
      return createDocumentAction({ direction: proposal.direction, documentDate: proposal.documentDate, counterparty: proposal.counterparty, subject: proposal.title, summary: proposal.summary, dueDate: proposal.dueDate });
    case "changeDocumentStatus":
      return changeDocumentStatusAction({ id: proposal.documentId, status: proposal.status });
    case "deleteDocument":
      return deleteDocumentAction({ id: proposal.documentId });
    case "createMeeting":
      return createMeetingAction({ type: proposal.type, title: proposal.title, meetingDate: proposal.meetingDate, startTime: proposal.startTime, endTime: null, location: proposal.location, quorumRequired: null, description: proposal.description, copyFromMeetingId: null });
    case "changeMeetingStatus":
      return changeMeetingStatusAction({ meetingId: proposal.meetingId, status: proposal.status, reason: proposal.reason });
    case "deleteMeeting":
      return deleteMeetingAction({ id: proposal.meetingId });
    case "createInventory": {
      const result = await createInventoryAction({ name: proposal.title, category: proposal.category, quantity: proposal.quantity, status: proposal.status, location: proposal.location ?? "", description: proposal.description ?? "", purchasePrice: null });
      return result.ok ? { ok: true } : { ok: false, error: `ai.errors.inventory.${result.error}` }; // i18n-ignore (çeviri anahtarı)
    }
    case "changeInventoryStatus": {
      const result = await updateInventoryStatusAction({ id: proposal.itemId, status: proposal.status });
      return result.ok ? { ok: true } : { ok: false, error: `ai.errors.inventory.${result.error}` }; // i18n-ignore (çeviri anahtarı)
    }
    case "deleteInventory": {
      const result = await deleteInventoryAction({ id: proposal.itemId });
      return result.ok ? { ok: true } : { ok: false, error: `ai.errors.inventory.${result.error}` }; // i18n-ignore (çeviri anahtarı)
    }
    case "createCourse":
      return createCourseAction({
        kind: proposal.courseKind,
        title: proposal.title,
        subject: proposal.subject ?? "",
        description: proposal.description ?? "",
        level: "",
        location: "",
        scheduleNote: "",
        startDate: proposal.startDate,
        endDate: proposal.endDate ?? "",
        capacity: "",
        feeType: "FREE",
        fee: "",
        installmentCount: "",
        status: "PLANNED",
        teacherIds: [],
      });
    case "changeCourseStatus": {
      // Kurs güncellemesi tam form ister: mevcut değerler korunur, yalnızca durum değişir.
      const course = await getCourse(proposal.courseId);
      if (!course) return { ok: false, error: "courses.errors.notFound" };
      return updateCourseAction({
        id: course.id,
        kind: course.kind,
        title: course.title,
        subject: course.subject ?? "",
        description: course.description ?? "",
        level: course.level ?? "",
        location: course.location ?? "",
        scheduleNote: course.scheduleNote ?? "",
        startDate: isoDay(course.startDate),
        endDate: isoDay(course.endDate),
        capacity: course.capacity ? String(course.capacity) : "",
        feeType: course.feeType,
        fee: course.feeCents ? (course.feeCents / 100).toFixed(2).replace(".", ",") : "",
        installmentCount: course.installmentCount ? String(course.installmentCount) : "",
        status: proposal.status,
        teacherIds: course.teacherIds,
      });
    }
    case "deleteCourse":
      return deleteCourseAction({ id: proposal.courseId });
  }
}

/**
 * Kullanıcının onayladığı asistan önerisini uygular. Üç denetim: önerinin modül + işlemi izin
 * matrisinde hâlâ açık mı; asistanı kullanma yetkisi; ve asıl işlemi yapan modül eylemi
 * kullanıcının KENDİ rol yetkisini ayrıca denetler.
 */
export async function executeAiProposalAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "view" },
    schema: proposalSchema,
    handler: async ({ input, audit }) => {
      const required = requiredPermission(input as AiProposal);
      if (!required) throw new ActionError("common.errors.unexpected");
      if (!isAllowed(await getAiPermissions(), required.module, required.operation)) throw new ActionError("ai.errors.permissionRevoked");
      const result = await apply(input as AiProposal);
      if (!result.ok) throw new ActionError(result.error ?? "common.errors.unexpected");
      await audit({ action: "AI_PROPOSAL_APPLIED", entity: "AiAssistant", entityId: undefined, after: { kind: input.kind, action: input.kind === "module" ? input.action : undefined, module: required.module, operation: required.operation } });
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
