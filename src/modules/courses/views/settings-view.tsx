import { getTranslations } from "next-intl/server";

import { listActiveCategoryOptions } from "@/modules/accounting/server";
import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { CoursesSettingsForm } from "../components/settings-form";
import { courseFeesPermissions } from "../permissions";
import { getCoursesSettings } from "../queries/course-parts";

export async function CoursesSettingsView() {
  try {
    await requirePermission(courseFeesPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("courses.settings");
  const [settings, categories, expenseCategories] = await Promise.all([getCoursesSettings(), listActiveCategoryOptions("INCOME"), listActiveCategoryOptions("EXPENSE")]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <CoursesSettingsForm settings={settings} categories={categories} expenseCategories={expenseCategories} />
    </div>
  );
}
