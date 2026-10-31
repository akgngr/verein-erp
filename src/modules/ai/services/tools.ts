import "server-only";

import { z } from "zod";

import { can } from "@/shared/permissions/define";

import type { SessionUser } from "@/modules/auth";
import { accountingPermissions } from "@/modules/accounting";
import { getIncomeExpenseReport, listAccountBalances } from "@/modules/accounting/server";
import { coursesPermissions, listCourseOptions } from "@/modules/courses/server";
import { eventsPermissions, listEvents } from "@/modules/events/server";
import { membersPermissions } from "@/modules/members";
import { getDuesStats, getMemberStats } from "@/modules/members/server";
import { documentsPermissions } from "@/modules/documents";
import { getDocumentStats } from "@/modules/documents/server";
import { donationsPermissions } from "@/modules/donations";
import { getDonationStats } from "@/modules/donations/server";
import { meetingsPermissions } from "@/modules/meetings";
import { getMeetingStats } from "@/modules/meetings/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { moduleAiRegistry } from "@/ai-registry";

import type { AiProposal } from "../types";
import { getAiPermissions, isAllowed, type AiOperation } from "./permissions";
import { EXTENDED_TOOLS } from "./tools-extended";
import { define, euros, YEAR_INPUT, yearSchema, type ToolContext } from "./tool-kit";

/**
 * Asistanın araçları. KURAL (KVKK/DSGVO): hiçbir araç kişi adı, iletişim bilgisi, adres,
 * banka verisi veya kimlik numarası döndürmez — yalnızca toplamlar, sayımlar ve kurumsal
 * kayıtlar (etkinlik, görev başlığı, kurs adı). Her araç üç kapıdan geçer: yöneticinin izin
 * matrisinde (modül + işlem) açık, hedef modül kullanılabilir ve kullanıcının kendi yetkisi var.
 * Araçlar veriyi DEĞİŞTİRMEZ; oluşturma/güncelleme/silme araçları yalnızca onay kartı önerir,
 * işlem kullanıcı onaylayınca executeAiProposalAction ile onun yetkisiyle yapılır.
 */

export type AssistantProposal = AiProposal;

/** Önerinin hangi modül + işlem iznine bağlı olduğu (yürütmede yeniden denetlenir). */
export const PROPOSAL_PERMISSION: Record<Exclude<AiProposal["kind"], "module">, { module: string; operation: AiOperation }> = {
  createEvent: { module: "events", operation: "create" },
  createDocument: { module: "documents", operation: "create" },
  changeDocumentStatus: { module: "documents", operation: "update" },
  deleteDocument: { module: "documents", operation: "delete" },
  createMeeting: { module: "meetings", operation: "create" },
  changeMeetingStatus: { module: "meetings", operation: "update" },
  deleteMeeting: { module: "meetings", operation: "delete" },
  createInventory: { module: "inventory", operation: "create" },
  changeInventoryStatus: { module: "inventory", operation: "update" },
  deleteInventory: { module: "inventory", operation: "delete" },
  createCourse: { module: "courses", operation: "create" },
  changeCourseStatus: { module: "courses", operation: "update" },
  deleteCourse: { module: "courses", operation: "delete" },
};


const BASE_TOOLS = [
  define({
    name: "get_accounting_summary",
    operation: "read",
    module: "accounting",
    allowed: (user) => can(user.role, accountingPermissions, "view"),
    description:
      "Income/expense summary for a fiscal year: actual, planned and previous-year amounts (EUR) per category and tax sphere, plus account balances. Contains no personal data.",
    schema: yearSchema,
    inputSchema: YEAR_INPUT,
    run: async ({ year }) => {
      const [report, balances] = await Promise.all([getIncomeExpenseReport(year), listAccountBalances()]);
      return {
        year,
        categories: report.rows
          .filter((row) => row.categoryId)
          .map((row) => ({
            category: row.categoryName,
            sphere: row.sphere,
            direction: row.direction,
            actualEur: euros(row.actualCents),
            planEur: euros(row.planCents),
            previousYearEur: euros(row.previousYearCents),
          })),
        economicOperationNotice: report.economicOperationNotice,
        accounts: balances.filter((account) => account.isActive).map((account) => ({ account: account.name, type: account.type, balanceEur: euros(account.balanceCents) })),
      };
    },
  }),
  define({
    name: "get_member_statistics",
    operation: "read",
    module: "members",
    allowed: (user) => can(user.role, membersPermissions, "view"),
    description: "Member counts by status and membership type, plus membership-fee collection statistics for a year. Numbers only; no member names or details.", // i18n-ignore (model-facing tool text)
    schema: yearSchema,
    inputSchema: YEAR_INPUT,
    run: async ({ year }) => {
      const [stats, dues] = await Promise.all([getMemberStats(), getDuesStats(year)]);
      return {
        members: stats,
        dues: {
          year: dues.year,
          expectedEur: euros(dues.expectedCents),
          collectedEur: euros(dues.collectedCents),
          remainingEur: euros(dues.remainingCents),
          collectionRatePercent: dues.collectionRate,
          openCount: dues.openCount,
          partialCount: dues.partialCount,
          paidCount: dues.paidCount,
          overdueCount: dues.overdueCount,
        },
      };
    },
  }),
  define({
    name: "list_upcoming_events",
    operation: "read",
    module: "events",
    allowed: (user) => can(user.role, eventsPermissions, "view"),
    description: "Upcoming events: title, type, status, dates, location, registered count and capacity. No attendee names.", // i18n-ignore (model-facing tool text)
    schema: z.object({ limit: z.number().int().min(1).max(25) }),
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", description: "Maximum number of events (1-25)" } }, // i18n-ignore (model-facing tool text)
      required: ["limit"],
      additionalProperties: false,
    },
    run: async ({ limit }) => {
      const result = await listEvents({ timeFilter: "upcoming", sort: "startDate", dir: "asc", pageSize: limit });
      return result.items.map((event) => ({
        title: event.title,
        type: event.type,
        status: event.status,
        start: event.startDate.toISOString(),
        end: event.endDate?.toISOString() ?? null,
        location: event.isOnline ? "online" : event.location,
        registered: event.registeredCount,
        capacity: event.capacity,
      }));
    },
  }),
  define({
    name: "list_courses",
    operation: "read",
    module: "courses",
    allowed: (user) => can(user.role, coursesPermissions, "view"),
    description: "Courses: code, title and status. No student data.", // i18n-ignore (model-facing tool text)
    schema: z.object({}),
    inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
    run: async () => (await listCourseOptions(null)).map((course) => ({ course: course.label, status: course.status })),
  }),
  define({
    name: "get_report_link",
    operation: "read",
    module: "accounting",
    allowed: (user) => can(user.role, accountingPermissions, "view"),
    description:
      "Returns a download link for a ready-made report (generated by the system with the user's own permissions; its content never reaches you). Give the link to the user as a markdown link.",
    schema: z.object({ report: z.enum(["income_expense_pdf", "income_expense_excel", "annual_report_pdf"]), year: z.number().int().min(2000).max(2100) }),
    inputSchema: {
      type: "object",
      properties: {
        report: {
          type: "string",
          enum: ["income_expense_pdf", "income_expense_excel", "annual_report_pdf"],
          description: "income_expense_pdf: income/expense list (PDF); income_expense_excel: same list (Excel); annual_report_pdf: annual treasurer report (Kassenbericht)", // i18n-ignore (model-facing tool text)
        },
        year: { type: "integer" },
      },
      required: ["report", "year"],
      additionalProperties: false,
    },
    run: async ({ report, year }) => {
      const url = {
        income_expense_pdf: `/api/accounting/export/pdf?year=${year}`,
        income_expense_excel: `/api/accounting/export?year=${year}`,
        annual_report_pdf: `/api/accounting/reports/annual/pdf?year=${year}`,
      }[report];
      return { url, note: "Give this link to the user; it opens in their browser with their own session." };
    },
  }),
  define({
    name: "get_meeting_statistics",
    module: "meetings",
    operation: "read",
    allowed: (user) => can(user.role, meetingsPermissions, "view"),
    description: "Meeting statistics: planned meetings, next meeting (number, title, date), draft minutes, open and overdue action items. No attendee names.", // i18n-ignore (model-facing tool text)
    schema: z.object({}),
    inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
    run: async () => {
      const stats = await getMeetingStats();
      return { ...stats, nextMeeting: stats.nextMeeting ? { number: stats.nextMeeting.meetingNumber, title: stats.nextMeeting.title, date: stats.nextMeeting.meetingDate.toISOString() } : null };
    },
  }),
  define({
    name: "get_document_statistics",
    module: "documents",
    operation: "read",
    allowed: (user) => can(user.role, documentsPermissions, "view"),
    description: "Correspondence register statistics: open, in progress, overdue, incoming and outgoing this month. Counts only.", // i18n-ignore (model-facing tool text)
    schema: z.object({}),
    inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
    run: async () => getDocumentStats(),
  }),
  define({
    name: "get_donation_statistics",
    module: "donations",
    operation: "read",
    allowed: (user) => can(user.role, donationsPermissions, "view"),
    description: "Donation statistics for a year: total (EUR), number of donations, confirmations issued and pending. No donor data.", // i18n-ignore (model-facing tool text)
    schema: yearSchema,
    inputSchema: YEAR_INPUT,
    run: async ({ year }) => {
      const stats = await getDonationStats(year);
      return { year, totalEur: euros(stats.totalCents), count: stats.count, unconfirmedOver300: stats.unconfirmedOver300Count, confirmationsIssued: stats.issuedConfirmationCount, confirmationWarnings: stats.warningConfirmationCount };
    },
  }),
  define({
    name: "propose_event",
    module: "events",
    operation: "create",
    allowed: (user) => can(user.role, eventsPermissions, "create"),
    description: "PROPOSES a new event. Nothing is created until the user confirms the card. Dates as ISO 8601 local time (YYYY-MM-DDTHH:mm).", // i18n-ignore (model-facing tool text)
    schema: z.object({
      title: z.string().min(3).max(200),
      description: z.string().max(2000).nullable(),
      type: z.enum(["WORKSHOP", "SEMINAR", "SOCIAL", "CULTURAL", "SPORTS", "OTHER"]),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable(),
      location: z.string().max(200).nullable(),
      isOnline: z.boolean(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: ["string", "null"] },
        type: { type: "string", enum: ["WORKSHOP", "SEMINAR", "SOCIAL", "CULTURAL", "SPORTS", "OTHER"] },
        startDate: { type: "string", description: "YYYY-MM-DDTHH:mm" }, // i18n-ignore (model-facing tool text)
        endDate: { type: ["string", "null"], description: "YYYY-MM-DDTHH:mm" }, // i18n-ignore (model-facing tool text)
        location: { type: ["string", "null"] },
        isOnline: { type: "boolean" },
      },
      required: ["title", "description", "type", "startDate", "endDate", "location", "isOnline"],
      additionalProperties: false,
    },
    run: async (input, { proposals }) => {
      proposals.push({ kind: "createEvent", ...input });
      return { status: "proposed", note: "A confirmation card was shown to the user; nothing is created until they confirm." }; // i18n-ignore (model-facing tool text)
    },
  }),
];

/**
 * Modül AI standardı: her modülün ai.ts dosyasındaki araçlar (src/ai-registry.ts üretilir).
 * Araç `propose` çağırdığında genel bir onay kartı oluşur; eylem onayda yeniden denetlenir.
 */
const MODULE_TOOLS = moduleAiRegistry.flatMap((entry) =>
  entry.tools.map((tool) =>
    define({
      name: tool.name,
      module: entry.module,
      operation: tool.operation,
      allowed: (user) => tool.allowed(user),
      description: tool.description,
      schema: tool.schema,
      inputSchema: tool.inputSchema,
      run: (input, { user, proposals }) =>
        tool.run(input, {
          user,
          propose: (proposal) => {
            const action = entry.actions[proposal.action];
            if (!action) throw new Error(`[ai] ${entry.module}: bilinmeyen eylem ${proposal.action}`); // i18n-ignore (geliştirici hatası)
            proposals.push({ kind: "module", module: entry.module, action: proposal.action, operation: action.operation, title: proposal.title, details: proposal.details ?? [], payload: proposal.payload });
          },
        }),
    }),
  ),
);

const TOOLS = [...BASE_TOOLS, ...EXTENDED_TOOLS, ...MODULE_TOOLS];

/** Bu kullanıcı için şu an kullanılabilir araçlar (modül izni + kullanıcı yetkisi). */
export async function availableTools(user: SessionUser) {
  const [usable, matrix] = await Promise.all([listUsableModuleKeys().then((keys) => new Set(keys)), getAiPermissions()]);
  return TOOLS.filter((tool) => isAllowed(matrix, tool.module, tool.operation) && usable.has(tool.module) && tool.allowed(user));
}

/** Matristeki her modül için asistanın gerçekten aracı olan işlemler (ayarlar ekranı). */
export function supportedOperations(): Record<string, AiOperation[]> {
  const result: Record<string, AiOperation[]> = {};
  for (const tool of TOOLS) {
    result[tool.module] = [...new Set([...(result[tool.module] ?? []), tool.operation])];
  }
  return result;
}

export type AvailableTool = (typeof TOOLS)[number];


/** Girdi şemayla doğrulanır; geçersizse model hata sonucu alır. */
export async function runTool(tool: AvailableTool, rawInput: unknown, context: ToolContext): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  const parsed = (tool.schema as z.ZodType).safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  try {
    return { ok: true, value: await (tool.run as (input: unknown, context: ToolContext) => Promise<unknown>)(parsed.data, context) };
  } catch (error) {
    console.error(`[ai] Araç hatası (${tool.name}):`, error);
    return { ok: false, error: "TOOL_FAILED" };
  }
}
