import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import type { SessionUser } from "@/modules/auth";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import type { RawSearchParams } from "@/shared/list-params";
import { parseListParams } from "@/shared/list-params";

import { UsersTable } from "../components/users-table";
import { RolePermissionsMatrix } from "../components/role-permissions-matrix";
import { UsersTabsContainer } from "../components/users-tabs-container";
import { getUserCountsByRole, listUsers } from "../queries/list-users";
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
  const params = parseListParams(await searchParams, {
    sortableFields: ["name", "email", "role", "isActive", "lastLoginAt", "createdAt"],
    defaultSort: "name",
    filterKeys: ["role", "status"],
  });

  const [{ rows, total }, roleCounts] = await Promise.all([
    listUsers(params),
    getUserCountsByRole(),
  ]);

  const canCreate = can(user.role, usersPermissions, "create");
  const canUpdate = can(user.role, usersPermissions, "update");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        actions={
          canCreate ? (
            <LinkButton href="/ayarlar/kullanicilar/yeni" startIcon={<Plus className="h-4 w-4" />}>
              {t("newUser")}
            </LinkButton>
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
          />
        }
        permissionsContent={
          <RolePermissionsMatrix users={rows} roleCounts={roleCounts} />
        }
      />
    </div>
  );
}
