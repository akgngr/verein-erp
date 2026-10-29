import { getTranslations } from "next-intl/server";

import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { UserCreateForm, UserFormCard } from "../components/user-form";
import { usersPermissions } from "../permissions";

export async function UserCreateView() {
  try {
    await requirePermission(usersPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("users");
  return (
    <div>
      <PageHeader
        title={t("createTitle")}
        description={t("createDescription")}
      />
      <UserFormCard>
        <UserCreateForm />
      </UserFormCard>
    </div>
  );
}
