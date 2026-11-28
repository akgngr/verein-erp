import { NextResponse } from "next/server";

import {
  ForbiddenError,
  UnauthorizedError,
  requirePermission,
  requireUser,
} from "@/modules/auth/server";
import { documentsPermissions } from "@/modules/documents";
import { listDocuments } from "@/modules/documents/server";
import { eventsPermissions } from "@/modules/events";
import { listEvents } from "@/modules/events/server";
import { inventoryPermissions } from "@/modules/inventory";
import { listInventoryItems } from "@/modules/inventory/server";
import { meetingsPermissions } from "@/modules/meetings";
import { listMeetings } from "@/modules/meetings/server";
import { membersPermissions } from "@/modules/members";
import { listMembers } from "@/modules/members/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { tasksPermissions } from "@/modules/tasks";
import { listTasks } from "@/modules/tasks/server";
import type { ListParams } from "@/shared/list-params";
import { can, type PermissionDefinition } from "@/shared/permissions/define";
import { isTimeBoxedRole } from "@/shared/security/external-grant";
import type { QuickSearchItem } from "@/shared/search/types";

const MAX_PER_MODULE = 5;

function makeListParams<F extends string>(q: string, defaultSort: string): ListParams<F> {
  return {
    page: 1,
    pageSize: 10,
    q,
    sort: defaultSort,
    dir: "desc",
    filters: {},
    skip: 0,
    take: MAX_PER_MODULE,
  };
}

/**
 * Authenticated, RBAC-enforced global search endpoint for the Ctrl/Cmd+K quick-search palette.
 * Queries ONLY active modules where the current user holds `view` permission via each module's
 * public `server.ts` boundary (respecting module data ownership & soft-delete rules).
 */
export async function GET(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, items: [] }, { status: 401 });
    }
    // Pending password change: requireUser refuses the session for everything but the change itself.
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ ok: false, items: [] }, { status: 403 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const usable = new Set(await listUsableModuleKeys());
  const tasks: Promise<QuickSearchItem[]>[] = [];
  const sessionUser = user;
  /**
   * Same rule as the module's own list page (`requirePermission`): time-boxed external reviewers
   * additionally need an active grant covering the module, and such a view is audited.
   */
  const mayView = async (moduleKey: string, definition: PermissionDefinition): Promise<boolean> => {
    if (!usable.has(moduleKey) || !can(sessionUser.role, definition, "view")) return false;
    if (!isTimeBoxedRole(sessionUser.role)) return true;
    try {
      await requirePermission(definition, "view");
      return true;
    } catch (error) {
      if (error instanceof ForbiddenError || error instanceof UnauthorizedError) return false;
      throw error;
    }
  };

  if (await mayView("members", membersPermissions)) {
    tasks.push(
      listMembers(makeListParams(q, "lastName"))
        .then((res) =>
          res.rows.slice(0, MAX_PER_MODULE).map((m) => ({
            id: `members:${m.id}`,
            kind: "record" as const,
            moduleKey: "members",
            title: `${m.firstName} ${m.lastName}`.trim(),
            subtitle: [m.membershipNumber, m.city].filter(Boolean).join(" · ") || null,
            href: `/uyeler/${m.id}`,
          })),
        )
        .catch(() => []),
    );
  }

  if (await mayView("documents", documentsPermissions)) {
    tasks.push(
      listDocuments(makeListParams(q, "documentDate"), user.id)
        .then((res) =>
          res.rows.slice(0, MAX_PER_MODULE).map((d) => ({
            id: `documents:${d.id}`,
            kind: "record" as const,
            moduleKey: "documents",
            title: d.subject,
            subtitle: [d.registryNumber, d.counterparty].filter(Boolean).join(" · ") || null,
            href: `/evrak/${d.id}`,
          })),
        )
        .catch(() => []),
    );
  }

  if (await mayView("meetings", meetingsPermissions)) {
    tasks.push(
      listMeetings(makeListParams(q, "meetingDate"))
        .then((res) =>
          res.rows.slice(0, MAX_PER_MODULE).map((m) => ({
            id: `meetings:${m.id}`,
            kind: "record" as const,
            moduleKey: "meetings",
            title: m.title,
            subtitle: m.meetingNumber,
            href: `/toplantilar/${m.id}`,
          })),
        )
        .catch(() => []),
    );
  }

  if (await mayView("tasks", tasksPermissions)) {
    tasks.push(
      listTasks(makeListParams(q, "dueDate"), { id: user.id, email: user.email })
        .then((res) =>
          res.rows.slice(0, MAX_PER_MODULE).map((t) => ({
            id: `tasks:${t.id}`,
            kind: "record" as const,
            moduleKey: "tasks",
            title: t.title,
            subtitle: t.memberName ?? null,
            href: `/tasks?q=${encodeURIComponent(t.title)}`,
          })),
        )
        .catch(() => []),
    );
  }

  if (await mayView("events", eventsPermissions)) {
    tasks.push(
      listEvents({ q, page: 1, pageSize: MAX_PER_MODULE })
        .then((res) =>
          res.items.slice(0, MAX_PER_MODULE).map((e) => ({
            id: `events:${e.id}`,
            kind: "record" as const,
            moduleKey: "events",
            title: e.title,
            subtitle: e.location ?? null,
            href: `/events/${e.id}`,
          })),
        )
        .catch(() => []),
    );
  }

  if (await mayView("inventory", inventoryPermissions)) {
    tasks.push(
      listInventoryItems({
        search: q,
        category: null,
        status: null,
        sort: "name",
        direction: "asc",
        requestedSort: null,
        requestedDirection: null,
        page: 1,
        pageSize: MAX_PER_MODULE,
      })
        .then((res) =>
          res.items.slice(0, MAX_PER_MODULE).map((item) => ({
            id: `inventory:${item.id}`,
            kind: "record" as const,
            moduleKey: "inventory",
            title: item.name,
            subtitle: [item.serialNumber, item.location].filter(Boolean).join(" · ") || null,
            href: `/inventory?search=${encodeURIComponent(item.name)}`,
          })),
        )
        .catch(() => []),
    );
  }

  const groups = await Promise.all(tasks);
  const items = groups.flat().slice(0, 30);

  return NextResponse.json(
    { ok: true, items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
