import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { donationsPermissions } from "../permissions";
import { DonorForm } from "../components/donor-form";

/** Yeni bağışçı (§ 15 md. 4). */
export async function DonorCreateView() {
  try {
    await requirePermission(donationsPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <FormDrawer title="">{<AccessDenied />}</FormDrawer>;
    throw error;
  }
  const t = await getTranslations("donations.donors.form");
  return (
    <FormDrawer title={t("createTitle")}>
      <DonorForm mode="create" />
    </FormDrawer>
  );
}
