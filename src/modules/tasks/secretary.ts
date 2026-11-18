import "server-only";

import { getDb } from "@/shared/db";
import { defineModuleSecretary, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";
import { findMemberIdsByEmail } from "@/modules/members/server";
import { resolveTaskAssigneeIds } from "./queries/assignee-identity";
import { tasksPermissions } from "./permissions";

/** Deterministic Berlin day; Task.dueDate is a Prisma @db.Date (UTC midnight). */
export function taskBerlinDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function buildTaskBriefing(counts: { overdue: number; today: number }, context: Pick<SecretaryContext, "t">, day: string): BriefingItem[] {
  const items: BriefingItem[] = [];
  if (counts.overdue > 0) items.push({
    id: "tasks:overdue",
    module: "tasks",
    kind: "overdue",
    severity: "danger",
    title: context.t("secretary.overdue", { count: counts.overdue }),
    count: counts.overdue,
    dueAt: day,
    href: "/tasks/bana-atananlar",
  });
  if (counts.today > 0) items.push({
    id: "tasks:due-today",
    module: "tasks",
    kind: "due-today",
    severity: "warning",
    title: context.t("secretary.dueToday", { count: counts.today }),
    count: counts.today,
    dueAt: day,
    href: "/tasks/bana-atananlar",
  });
  return items;
}

/** Mirrors the existing Tasks "mine" identity policy, not a name-only match. */
async function countMine(context: SecretaryContext): Promise<{ overdue: number; today: number }> {
  const { getUserProfiles } = await import("@/modules/auth/server");
  const [user] = await getUserProfiles([context.user.id]);
  if (!user?.isActive) return { overdue: 0, today: 0 };
  const memberIds = await resolveTaskAssigneeIds({ id: context.user.id, email: user.email }, findMemberIdsByEmail);
  const day = new Date(`${taskBerlinDay(context.now)}T00:00:00.000Z`);
  const common = {
    status: { in: ["OPEN", "IN_PROGRESS"] as ("OPEN" | "IN_PROGRESS")[] },
    OR: [{ createdById: context.user.id }, { memberId: { in: memberIds } }],
  };
  const [overdue, today] = await Promise.all([
    getDb().task.count({ where: { ...common, dueDate: { lt: day } } }),
    getDb().task.count({ where: { ...common, dueDate: day } }),
  ]);
  return { overdue, today };
}

export const secretary = defineModuleSecretary({
  module: "tasks",
  providers: [{
    key: "mine",
    permission: { definition: tasksPermissions, action: "view" },
    collect: async (context) => buildTaskBriefing(await countMine(context), context, taskBerlinDay(context.now)),
  }],
});
