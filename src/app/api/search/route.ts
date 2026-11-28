import { NextResponse } from "next/server";

import { requireUser, UnauthorizedError } from "@/modules/auth/server";
import { documentsPermissions } from "@/modules/documents";
import {
  DOCUMENT_DEFAULT_SORT,
  DOCUMENT_SORTABLE_FIELDS,
  listDocuments,
} from "@/modules/documents/server";
import { eventsPermissions } from "@/modules/events";
import { listEvents } from "@/modules/events/server";
import { inventoryPermissions } from "@/modules/inventory";
import { listInventoryItems } from "@/modules/inventory/server";
import { meetingsPermissions } from "@/modules/meetings";
import {
  listMeetings,
  MEETING_DEFAULT_SORT,
  MEETING_SORTABLE_FIELDS,
} from "@/modules/meetings/server";
import { membersPermissions } from "@/modules/members";
import {
  listMembers,
  MEMBER_DEFAULT_SORT,
  MEMBER_SORTABLE_FIELDS,
} from "@/modules/members/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { tasksPermissions } from "@/modules/tasks";
import {
  listTasks,
  TASK_DEFAULT_SORT,
  TASK_SORTABLE_FIELDS,
} from "@/modules/tasks/server";
import { parseListParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

export type QuickSearchResultItem = {
  id: string;
  module: "members" | "documents" | "meetings" | "tasks" | "events" | "inventory";
  title: string;
  subtitle: string;
  href: string;
};

export async function GET(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ ok: true, results: [] satisfies QuickSearchResultItem[] });
  }

  const usable = new Set(await listUsableModuleKeys());
  const results: QuickSearchResultItem[] = [];
  const tasks: Promise<void>[] = [];

  if (usable.has("members") && can(user.role, membersPermissions, "view")) {
    tasks.push(
      (async () => {
        const params = parseListParams(
          { q, pageSize: "5" },
          {
            sortableFields: MEMBER_SORTABLE_FIELDS,
            defaultSort: MEMBER_DEFAULT_SORT,
            defaultDir: "asc",
            filterKeys: ["status", "type"],
          },
        );
        const res = await listMembers(params);
        for (const row of res.rows.slice(0, 5)) {
          results.push({
            id: `members:${row.id}`,
            module: "members",
            title: `${row.firstName} ${row.lastName}`.trim(),
            subtitle: row.membershipNumber,
            href: `/uyeler/${row.id}`,
          });
        }
      })().catch(() => undefined),
    );
  }

  if (usable.has("documents") && can(user.role, documentsPermissions, "view")) {
    tasks.push(
      (async () => {
        const params = parseListParams(
          { q, pageSize: "5" },
          {
            sortableFields: DOCUMENT_SORTABLE_FIELDS,
            defaultSort: DOCUMENT_DEFAULT_SORT,
            defaultDir: "desc",
            filterKeys: ["direction", "status", "categoryId", "assigneeId", "from", "to", "mine", "overdue"],
          },
        );
        const res = await listDocuments(params, user.id);
        for (const row of res.rows.slice(0, 5)) {
          results.push({
            id: `documents:${row.id}`,
            module: "documents",
            title: row.subject,
            subtitle: `${row.registryNumber} · ${row.counterparty}`,
            href: `/evrak/${row.id}`,
          });
        }
      })().catch(() => undefined),
    );
  }

  if (usable.has("meetings") && can(user.role, meetingsPermissions, "view")) {
    tasks.push(
      (async () => {
        const params = parseListParams(
          { q, pageSize: "5" },
          {
            sortableFields: MEETING_SORTABLE_FIELDS,
            defaultSort: MEETING_DEFAULT_SORT,
            defaultDir: "desc",
            filterKeys: ["type", "status", "dateFrom", "dateTo"],
          },
        );
        const res = await listMeetings(params);
        for (const row of res.rows.slice(0, 5)) {
          results.push({
            id: `meetings:${row.id}`,
            module: "meetings",
            title: row.title,
            subtitle: row.meetingNumber,
            href: `/toplantilar/${row.id}`,
          });
        }
      })().catch(() => undefined),
    );
  }

  if (usable.has("tasks") && can(user.role, tasksPermissions, "view")) {
    tasks.push(
      (async () => {
        const params = parseListParams(
          { q, pageSize: "5" },
          {
            sortableFields: TASK_SORTABLE_FIELDS,
            defaultSort: TASK_DEFAULT_SORT,
            defaultDir: "desc",
            filterKeys: ["status", "priority", "memberId", "mine", "overdue"],
          },
        );
        const res = await listTasks(params, user);
        for (const row of res.rows.slice(0, 5)) {
          results.push({
            id: `tasks:${row.id}`,
            module: "tasks",
            title: row.title,
            subtitle: row.status,
            href: `/tasks?duzenle=${row.id}`,
          });
        }
      })().catch(() => undefined),
    );
  }

  if (usable.has("events") && can(user.role, eventsPermissions, "view")) {
    tasks.push(
      (async () => {
        const res = await listEvents({ q, pageSize: 5 });
        for (const row of res.items.slice(0, 5)) {
          results.push({
            id: `events:${row.id}`,
            module: "events",
            title: row.title,
            subtitle: row.location ?? row.type,
            href: `/etkinlikler/${row.id}`,
          });
        }
      })().catch(() => undefined),
    );
  }

  if (usable.has("inventory") && can(user.role, inventoryPermissions, "view")) {
    tasks.push(
      (async () => {
        const res = await listInventoryItems({
          search: q,
          category: null,
          status: null,
          sort: "createdAt",
          direction: "desc",
          requestedSort: null,
          requestedDirection: null,
          page: 1,
          pageSize: 5,
        });
        for (const row of res.items.slice(0, 5)) {
          results.push({
            id: `inventory:${row.id}`,
            module: "inventory",
            title: row.name,
            subtitle: row.serialNumber ?? row.category ?? "",
            href: `/envanter/${row.id}`,
          });
        }
      })().catch(() => undefined),
    );
  }

  await Promise.all(tasks);

  return NextResponse.json({ ok: true, results });
}
