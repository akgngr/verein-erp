import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from "../constants";
import type { MeetingOption, MemberOption, TaskFilterKeys, TaskPriority, TasksRow, TaskStatus } from "../types";
import { berlinToday, formatDateOnly, isTaskOverdue } from "../utils";

export const TASK_SORTABLE_FIELDS = [
  "title",
  "status",
  "priority",
  "dueDate",
  "updatedAt",
  "createdAt",
] as const;

export const TASK_DEFAULT_SORT = "updatedAt";

/**
 * Görev listesi where koşulu üreticisi.
 */
export async function buildTaskWhere(
  params: ListParams<TaskFilterKeys>,
  currentUser?: { id: string; email: string } | null,
): Promise<Prisma.TaskWhereInput> {
  const conditions: Prisma.TaskWhereInput[] = [];

  if (params.q) {
    conditions.push({
      OR: [
        { title: { contains: params.q, mode: "insensitive" } },
        { description: { contains: params.q, mode: "insensitive" } },
        { memberName: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }

  const statusFilter = params.filters.status;
  if (statusFilter && statusFilter !== "*" && statusFilter !== "__all__") {
    if (TASK_STATUS_VALUES.includes(statusFilter as TaskStatus)) {
      conditions.push({ status: statusFilter as TaskStatus });
    }
  }

  const priorityFilter = params.filters.priority;
  if (priorityFilter && priorityFilter !== "*" && priorityFilter !== "__all__") {
    if (TASK_PRIORITY_VALUES.includes(priorityFilter as TaskPriority)) {
      conditions.push({ priority: priorityFilter as TaskPriority });
    }
  }

  const memberIdFilter = params.filters.memberId;
  if (memberIdFilter && memberIdFilter !== "*" && memberIdFilter !== "__all__") {
    conditions.push({ memberId: memberIdFilter });
  }

  // "Bana atananlar" filtresi: oturum kullanıcısına veya kullanıcının e-postasıyla eşleşen üyeye atanmışlar.
  if (params.filters.mine === "1" && currentUser) {
    const db = getDb();
    const userMembers = await db.member.findMany({
      where: { email: currentUser.email, deletedAt: null },
      select: { id: true },
    });
    const candidateIds = [currentUser.id, ...userMembers.map((m) => m.id)];
    conditions.push({
      OR: [
        { memberId: { in: candidateIds } },
        { createdById: currentUser.id },
      ],
    });
  }

  const today = berlinToday();
  if (params.filters.overdue === "1") {
    conditions.push({
      dueDate: { lt: today },
      status: { notIn: ["DONE", "CANCELLED"] },
    });
  }

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  return { AND: conditions };
}

/** Liste sorgusu: arama, filtreler, sıralama ve sayfalama. */
export async function listTasks(
  params: ListParams<TaskFilterKeys>,
  currentUser?: { id: string; email: string } | null,
): Promise<ListResult<TasksRow>> {
  const where = await buildTaskWhere(params, currentUser);
  const db = getDb();

  const [rows, total] = await Promise.all([
    db.task.findMany({
      where,
      orderBy: { [params.sort]: params.dir },
      skip: params.skip,
      take: params.take,
    }),
    db.task.count({ where }),
  ]);

  // Toplantı adlarını doldur
  const meetingIds = Array.from(new Set(rows.map((r) => r.meetingId).filter((id): id is string => Boolean(id))));
  const meetingsMap = new Map<string, string>();
  if (meetingIds.length > 0) {
    const meetings = await db.meeting.findMany({
      where: { id: { in: meetingIds } },
      select: { id: true, meetingNumber: true, title: true },
    });
    for (const m of meetings) {
      meetingsMap.set(m.id, `${m.meetingNumber} - ${m.title}`);
    }
  }

  const today = berlinToday();
  const taskRows: TasksRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    dueDate: formatDateOnly(r.dueDate),
    memberId: r.memberId,
    memberName: r.memberName,
    meetingId: r.meetingId,
    meetingLabel: r.meetingId ? meetingsMap.get(r.meetingId) ?? null : null,
    isOverdue: isTaskOverdue(r.status, r.dueDate, today),
    completedAt: r.completedAt,
    completedById: r.completedById,
    completedByLabel: r.completedByLabel,
    createdById: r.createdById,
    createdByLabel: r.createdByLabel,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return { rows: taskRows, total, page: params.page, pageSize: params.pageSize };
}

export async function getTask(id: string): Promise<TasksRow | null> {
  const db = getDb();
  const r = await db.task.findUnique({ where: { id } });
  if (!r) return null;

  let meetingLabel: string | null = null;
  if (r.meetingId) {
    const meeting = await db.meeting.findUnique({
      where: { id: r.meetingId },
      select: { meetingNumber: true, title: true },
    });
    if (meeting) {
      meetingLabel = `${meeting.meetingNumber} - ${meeting.title}`;
    }
  }

  const today = berlinToday();
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    dueDate: formatDateOnly(r.dueDate),
    memberId: r.memberId,
    memberName: r.memberName,
    meetingId: r.meetingId,
    meetingLabel,
    isOverdue: isTaskOverdue(r.status, r.dueDate, today),
    completedAt: r.completedAt,
    completedById: r.completedById,
    completedByLabel: r.completedByLabel,
    createdById: r.createdById,
    createdByLabel: r.createdByLabel,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Formlar ve filtreler için üye ve toplantı seçenekleri. */
export async function getTaskFormOptions(): Promise<{
  memberOptions: MemberOption[];
  meetingOptions: MeetingOption[];
}> {
  const db = getDb();

  const [members, meetings] = await Promise.all([
    db.member.findMany({
      where: { deletedAt: null },
      select: { id: true, firstName: true, lastName: true, membershipNumber: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    db.meeting.findMany({
      where: { deletedAt: null },
      select: { id: true, meetingNumber: true, title: true },
      orderBy: { meetingDate: "desc" },
      take: 100,
    }),
  ]);

  return {
    memberOptions: members.map((m) => ({
      id: m.id,
      label: `${m.firstName} ${m.lastName} (${m.membershipNumber})`,
    })),
    meetingOptions: meetings.map((m) => ({
      id: m.id,
      label: `${m.meetingNumber} - ${m.title}`,
    })),
  };
}
