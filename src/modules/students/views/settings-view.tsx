import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { StudentsSettingsForm } from "../components/settings-form";
import { studentsDatevPermissions } from "../permissions";
import { getStudentsSettings } from "../queries/settings";

export async function StudentsSettingsView() {
  let user;
  try {
    user = await requirePermission(studentsDatevPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("students.settings");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <StudentsSettingsForm initial={await getStudentsSettings()} canUpdate={can(user.role, studentsDatevPermissions, "update")} />
      <p className="max-w-2xl text-small text-default-500">{t("datevNote")}</p>
    </div>
  );
}
