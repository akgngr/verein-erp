import { Plus } from "lucide-react";
import { FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { UserCreateView } from "./user-create-view";
import { UserEditView } from "./user-edit-view";
import { getTranslations } from "next-intl/server";

import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import type { SessionUser } from "@/modules/auth";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import type { RawSearchParams } from "@/shared/list-params";
import { parseListParams } from "@/shared/list-params";

import { UsersTable } from "../components/users-table";
import { RolePermissionsMatrix } from "../components/role-permissions-matrix";
import { UsersTabsContainer } from "../components/users-tabs-container";
import { listUsers } from "../queries/list-users";
import { countUsersByRole } from "../services/roles";
import { usersPermissions } from "../permissions";

export async function UsersListView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let user: SessionUser;
  try {
    user = await requirePermission(usersPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("users");
  const raw = await searchParams;
  const params = parseListParams(raw, {
    sortableFields: ["name", "email", "role", "isActive", "lastLoginAt", "createdAt"],
    defaultSort: "name",
    filterKeys: ["role", "status"],
  });

  const [{ rows, total }, roleCounts] = await Promise.all([listUsers(params), countUsersByRole()]);

  const canCreate = can(user.role, usersPermissions, "create");
  const canUpdate = can(user.role, usersPermissions, "update");
  const canDelete = can(user.role, usersPermissions, "delete");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        actions={
          canCreate ? (
            <FormDrawerButton param="yeni" startIcon={<Plus className="h-4 w-4" />}>
              {t("newUser")}
            </FormDrawerButton>
          ) : undefined
        }
      />

      <UsersTabsContainer
        usersContent={
          <UsersTable
            rows={rows}
            total={total}
            page={params.page}
            pageSize={params.pageSize}
            sort={params.sort}
            dir={params.dir}
            q={params.q}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        }
        permissionsContent={
          <RolePermissionsMatrix userCounts={roleCounts} canManage={canUpdate} />
        }
      />
      {canCreate && raw.yeni !== undefined ? <UserCreateView /> : null}
      {canUpdate && typeof raw.duzenle === "string" && raw.duzenle ? <UserEditView userId={raw.duzenle} /> : null}
    </div>
  );
}
