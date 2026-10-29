import { getTranslations } from "next-intl/server";

import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { UserCreateForm, UserFormCard } from "../components/user-form";
import { usersPermissions } from "../permissions";

export async function UserCreateView() {
  try {
    await requirePermission(usersPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <FormDrawer title="">{<AccessDenied />}</FormDrawer>;
    throw error;
  }

  const t = await getTranslations("users");
  return (
    <FormDrawer title={t("createTitle")} description={t("createDescription")}>
      <UserFormCard>
        <UserCreateForm />
      </UserFormCard>
    </FormDrawer>
  );
}
