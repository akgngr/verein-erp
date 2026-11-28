import "server-only";

import { crmPermissions } from "@/modules/crm";
import { listOpenFollowUpsForHub } from "@/modules/crm/server";
import { meetingsPermissions } from "@/modules/meetings";
import { listActionItems } from "@/modules/meetings/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { parseListParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

export type UnifiedLinkedTaskItem = {
  id: string;
  source: "meetings" | "crm";
  title: string;
  subtitle: string;
  assigneeLabel: string | null;
  dueAt: string | null;
  overdue: boolean;
  href: string;
};

/**
 * Toplantı aksiyon maddeleri (meetings) ve CRM takiplerini (crm) birleştirir.
 * Modül aktifliği + modül bazlı view yetkisi sıkı biçimde denetlenir.
 */
export async function listUnifiedLinkedItems(
  user: { id: string; role: Parameters<typeof can>[0] },
  options: { assignedToMe: boolean },
): Promise<UnifiedLinkedTaskItem[]> {
  const usable = new Set(await listUsableModuleKeys());
  const now = new Date();
  const items: UnifiedLinkedTaskItem[] = [];

  const tasks: Promise<void>[] = [];

  if (usable.has("meetings") && can(user.role, meetingsPermissions, "view")) {
    tasks.push(
      (async () => {
        const params = parseListParams(
          {
            status: "OPEN",
            ...(options.assignedToMe ? { mine: "1" } : {}),
          },
          {
            sortableFields: ["dueDate", "status", "createdAt"] as const,
            defaultSort: "dueDate",
            defaultDir: "asc",
            filterKeys: ["status", "assigneeId", "mine", "overdue"],
          },
        );
        const result = await listActionItems(params, user.id);
        for (const row of result.rows) {
          const dueAt = row.dueDate ? row.dueDate.toISOString() : null;
          items.push({
            id: `meetings:${row.id}`,
            source: "meetings",
            title: row.description,
            subtitle: `${row.meetingNumber} · ${row.meetingTitle}`,
            assigneeLabel: row.assigneeLabel,
            dueAt,
            overdue: Boolean(row.dueDate && row.dueDate < now),
            href: `/toplantilar/${row.meetingId}`,
          });
        }
      })(),
    );
  }

  if (usable.has("crm") && can(user.role, crmPermissions, "view")) {
    tasks.push(
      (async () => {
        const followUps = await listOpenFollowUpsForHub(
          { role: user.role, restrictedLabel: "—" },
          options.assignedToMe ? { assigneeId: user.id } : undefined,
        );
        for (const row of followUps) {
          const dueDate = new Date(row.dueAt);
          items.push({
            id: `crm:${row.id}`,
            source: "crm",
            title: row.note,
            subtitle: row.partyName,
            assigneeLabel: null,
            dueAt: row.dueAt,
            overdue: !Number.isNaN(dueDate.getTime()) && dueDate < now,
            href: `/crm/${row.partyId}`,
          });
        }
      })(),
    );
  }

  await Promise.all(tasks);

  items.sort((a, b) => {
    if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return a.title.localeCompare(b.title);
  });

  return items;
}
