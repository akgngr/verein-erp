import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { can } from "@/shared/permissions/define";
import { parseListParams } from "@/shared/list-params";

import type { SessionUser } from "@/modules/auth";
import { accountingPermissions } from "@/modules/accounting";
import { getIncomeExpenseReport, listAccountBalances } from "@/modules/accounting/server";
import { coursesPermissions, listCourseOptions } from "@/modules/courses/server";
import { eventsPermissions, listEvents } from "@/modules/events/server";
import { membersPermissions } from "@/modules/members";
import { getDuesStats, getMemberStats } from "@/modules/members/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { listTasks, TASK_DEFAULT_SORT, TASK_SORTABLE_FIELDS, tasksPermissions } from "@/modules/tasks/server";

/**
 * Asistanın araçları. KURAL (KVKK/DSGVO): hiçbir araç kişi adı, iletişim bilgisi, adres,
 * banka verisi veya kimlik numarası döndürmez — yalnızca toplamlar, sayımlar ve kurumsal
 * kayıtlar (etkinlik, görev başlığı, kurs adı). Her araç iki kapıdan geçer: hedef modül
 * kullanılabilir (etkin + AI modülüne erişim izni onaylı) ve kullanıcının kendi yetkisi var.
 * Veri değiştiren işlem yoktur; "propose_*" araçları yalnızca kullanıcıya onay kartı önerir.
 */

export type AssistantProposal = {
  kind: "createTask";
  title: string;
  description: string | null;
  priority: "LOW" | "NORMAL" | "HIGH";
  dueDate: string | null;
};

type ToolContext = { user: SessionUser; proposals: AssistantProposal[] };

type ToolDefinition<S extends z.ZodType> = {
  name: string;
  module: string;
  allowed: (user: SessionUser) => boolean;
  description: string;
  schema: S;
  inputSchema: Anthropic.Tool["input_schema"];
  run: (input: z.infer<S>, context: ToolContext) => Promise<unknown>;
};

const define = <S extends z.ZodType>(tool: ToolDefinition<S>) => tool;
const yearSchema = z.object({ year: z.number().int().min(2000).max(2100) });
const YEAR_INPUT: Anthropic.Tool["input_schema"] = {
  type: "object",
  properties: { year: { type: "integer", description: "Fiscal year, e.g. 2026" } }, // i18n-ignore (model-facing tool text)
  required: ["year"],
  additionalProperties: false,
};
const euros = (cents: number) => Math.round(cents) / 100;

const TOOLS = [
  define({
    name: "get_accounting_summary",
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
    name: "list_open_tasks",
    module: "tasks",
    allowed: (user) => can(user.role, tasksPermissions, "view"),
    description: "Open and in-progress tasks: title, status, priority, due date, overdue flag. No assignee data. mine=true returns only the current user's tasks.",
    schema: z.object({ mine: z.boolean() }),
    inputSchema: {
      type: "object",
      properties: { mine: { type: "boolean", description: "Only tasks assigned to the current user" } }, // i18n-ignore (model-facing tool text)
      required: ["mine"],
      additionalProperties: false,
    },
    run: async ({ mine }, { user }) => {
      const params = parseListParams(
        { pageSize: "50", ...(mine ? { mine: "1" } : {}) },
        { sortableFields: TASK_SORTABLE_FIELDS, defaultSort: TASK_DEFAULT_SORT, filterKeys: ["status", "priority", "memberId", "mine", "overdue"] },
      );
      const result = await listTasks(params, user);
      return result.rows
        .filter((task) => task.status === "OPEN" || task.status === "IN_PROGRESS")
        .map((task) => ({ title: task.title, status: task.status, priority: task.priority, dueDate: task.dueDate, overdue: task.isOverdue }));
    },
  }),
  define({
    name: "list_courses",
    module: "courses",
    allowed: (user) => can(user.role, coursesPermissions, "view"),
    description: "Courses: code, title and status. No student data.", // i18n-ignore (model-facing tool text)
    schema: z.object({}),
    inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
    run: async () => (await listCourseOptions(null)).map((course) => ({ course: course.label, status: course.status })),
  }),
  define({
    name: "get_report_link",
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
    name: "propose_task",
    module: "tasks",
    allowed: (user) => can(user.role, tasksPermissions, "create"),
    description:
      "PROPOSES a new task to the user. Nothing is created: the user confirms it from a card in the panel, with their own permissions. Do not put personal names or contact details in it.",
    schema: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).nullable(),
      priority: z.enum(["LOW", "NORMAL", "HIGH"]),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: ["string", "null"] },
        priority: { type: "string", enum: ["LOW", "NORMAL", "HIGH"] },
        dueDate: { type: ["string", "null"], description: "YYYY-MM-DD" },
      },
      required: ["title", "description", "priority", "dueDate"],
      additionalProperties: false,
    },
    run: async (input, { proposals }) => {
      proposals.push({ kind: "createTask", ...input });
      return { status: "proposed", note: "A confirmation card was shown to the user; the task is not created until they confirm." };
    },
  }),
];

/** Bu kullanıcı için şu an kullanılabilir araçlar (modül izni + kullanıcı yetkisi). */
export async function availableTools(user: SessionUser) {
  const usable = new Set(await listUsableModuleKeys());
  return TOOLS.filter((tool) => usable.has(tool.module) && tool.allowed(user));
}

export type AvailableTool = (typeof TOOLS)[number];

export function toApiTool(tool: AvailableTool): Anthropic.Tool {
  return { name: tool.name, description: tool.description, input_schema: tool.inputSchema, strict: true };
}

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
