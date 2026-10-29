import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { TasksItemTable } from "../components/item-table";
import { tasksPermissions } from "../permissions";
import {
  getTaskFormOptions,
  listTasks,
  TASK_DEFAULT_SORT,
  TASK_SORTABLE_FIELDS,
} from "../queries/list-items";
import type { TaskFilterKeys } from "../types";
import { TasksItemCreateView } from "./item-create-view";
import { TasksItemEditView } from "./item-edit-view";

/**
 * Sunucu view'ı: HeroUI içe AKTARMAZ (istemci gerektiren her şey components/ altında).
 * Form çekmecesi URL'den açılır: `?yeni` → oluşturma, `?duzenle=<id>` → düzenleme.
 */
export async function TasksListView({
  searchParams,
  assignedToMe = false,
}: {
  searchParams: Promise<RawSearchParams>;
  assignedToMe?: boolean;
}) {
  let user;
  try {
    user = await requirePermission(tasksPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("tasks");
  const raw = await searchParams;
  const filterKeys: TaskFilterKeys[] = ["status", "priority", "memberId", "mine", "overdue"];

  const params = parseListParams(raw, {
    sortableFields: TASK_SORTABLE_FIELDS,
    defaultSort: TASK_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys,
  });

  if (assignedToMe) {
    params.filters.mine = "1";
  }

  const [list, options] = await Promise.all([
    listTasks(params, user),
    getTaskFormOptions(),
  ]);

  const canCreate = can(user.role, tasksPermissions, "create");
  const canUpdate = can(user.role, tasksPermissions, "update");
  const canDelete = can(user.role, tasksPermissions, "delete");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={assignedToMe ? t("assignedToMeTitle") : t("title")}
        description={assignedToMe ? t("assignedToMeDescription") : t("description")}
        actions={
          canCreate ? (
            <FormDrawerButton param="yeni" startIcon={<Plus className="h-4 w-4" />}>
              {t("newItem")}
            </FormDrawerButton>
          ) : null
        }
      />
      <TasksItemTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        memberOptions={options.memberOptions}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
      {canCreate && raw.yeni !== undefined ? <TasksItemCreateView /> : null}
      {canUpdate && typeof raw.duzenle === "string" && raw.duzenle ? (
        <TasksItemEditView id={raw.duzenle} />
      ) : null}
    </div>
  );
}
