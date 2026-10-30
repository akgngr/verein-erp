import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import { listMeetingOptions } from "@/modules/meetings/server";
import { findMemberIdsByEmail, listMemberOptions } from "@/modules/members/server";
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
    const candidateIds = [currentUser.id, ...(await findMemberIdsByEmail(currentUser.email))];
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
    for (const meeting of await listMeetingOptions({ ids: meetingIds })) {
      meetingsMap.set(meeting.id, meeting.label);
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
    const [meeting] = await listMeetingOptions({ ids: [r.meetingId] });
    meetingLabel = meeting?.label ?? null;
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
  const [members, meetings] = await Promise.all([listMemberOptions(), listMeetingOptions()]);

  return {
    memberOptions: members.map((member) => ({
      id: member.id,
      label: `${member.label} (${member.membershipNumber})`,
    })),
    meetingOptions: meetings,
  };
}
