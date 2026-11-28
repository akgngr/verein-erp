import "server-only";

import { crmPermissions } from "@/modules/crm";
import { listOpenFollowUpsForHub } from "@/modules/crm/server";
import { meetingsPermissions } from "@/modules/meetings";
import { listActionItems } from "@/modules/meetings/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

import { berlinToday, formatDateOnly } from "../utils";
import {
  sortUnifiedLinkedItems,
  toCrmHubItem,
  type UnifiedLinkedTaskItem,
  type UnifiedTaskSource,
} from "../services/unified-hub-sort";

export { sortUnifiedLinkedItems, type UnifiedLinkedTaskItem, type UnifiedTaskSource };

/**
 * Aggregates open action items from Meetings and open follow-ups from CRM for
 * the Unified Task Hub (`/tasks` and `/tasks/bana-atananlar`), enforcing both
 * active module availability and per-module `view` permissions.
 */
export async function listUnifiedLinkedItems(
  user: { id: string; role: Role },
  options: { assignedToMe?: boolean; q?: string } = {},
): Promise<UnifiedLinkedTaskItem[]> {
  const usable = new Set(await listUsableModuleKeys());
  const todayIso = formatDateOnly(berlinToday()) ?? new Date().toISOString().slice(0, 10);
  const tasks: Promise<UnifiedLinkedTaskItem[]>[] = [];

  if (usable.has("meetings") && can(user.role, meetingsPermissions, "view")) {
    tasks.push(
      listActionItems(
        {
          page: 1,
          pageSize: 25,
          q: options.q ?? "",
          sort: "dueDate",
          dir: "asc",
          filters: options.assignedToMe ? { mine: "1" } : {},
          skip: 0,
          take: 25,
        },
        user.id,
      )
        .then((res) =>
          res.rows.map((row) => {
            const dueIso = row.dueDate ? formatDateOnly(row.dueDate) : null;
            return {
              id: `meetings:${row.id}`,
              source: "meetings" as const,
              title: row.description,
              contextLabel: `${row.meetingNumber} · ${row.meetingTitle}`,
              assigneeLabel: row.assigneeLabel ?? null,
              dueDate: dueIso,
              isOverdue: Boolean(dueIso && dueIso < todayIso),
              href: `/toplantilar/${row.meetingId}?sekme=gorevler`,
            };
          }),
        )
        .catch(() => []),
    );
  }

  if (usable.has("crm") && can(user.role, crmPermissions, "view")) {
    tasks.push(
      listOpenFollowUpsForHub(
        { role: user.role, restrictedLabel: "—" },
        { assigneeId: options.assignedToMe ? user.id : undefined, limit: 25, q: options.q },
      )
        .then((rows) => rows.map((row) => toCrmHubItem(row)),
        )
        .catch(() => []),
    );
  }

  const groups = await Promise.all(tasks);
  return sortUnifiedLinkedItems(groups.flat());
}
