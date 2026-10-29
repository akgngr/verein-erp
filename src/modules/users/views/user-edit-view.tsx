import { getTranslations } from "next-intl/server";

import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";

import { UserEditForm, UserFormCard } from "../components/user-form";
import { getUserById } from "../queries/list-users";
import { usersPermissions } from "../permissions";

export async function UserEditView({ userId }: { userId: string }) {
  try {
    await requirePermission(usersPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("users");
  const user = await getUserById(userId);
  if (!user) {
    return <EmptyState title={t("notFoundTitle")} description={t("notFoundDescription")} />;
  }

  return (
    <div>
      <PageHeader
        title={t("editTitle")}
        description={`${user.name} — ${user.email}`}
      />
      <UserFormCard>
        <UserEditForm
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
          }}
        />
      </UserFormCard>
    </div>
  );
}
