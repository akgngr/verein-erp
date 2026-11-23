import { getTranslations } from "next-intl/server";

import { requirePermission, requireUser, ForbiddenError } from "@/modules/auth/server";
import { getWidgetSettings } from "@/modules/widgets/server";
import { widgetsPermissions } from "@/modules/widgets";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { settingsPermissions } from "@/shared/permissions/system";

import { WidgetSettingsForm } from "../components/widget-settings-form";
import { listUsableModuleKeys } from "../services/module-gate";

export async function WidgetSettingsView() {
  try {
    await requirePermission(settingsPermissions, "view");
    await requirePermission(widgetsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const user = await requireUser();
  const [rows, t, root] = await Promise.all([
    listUsableModuleKeys().then((keys) => getWidgetSettings(user, keys)),
    getTranslations("system.ui.widgetSettings"),
    getTranslations(),
  ]);
  const widgets = rows.map((row) => ({
    ...row,
    title: root.has(row.titleKey) ? root(row.titleKey) : row.id,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <WidgetSettingsForm key={JSON.stringify(widgets.map(({ id, enabled, order }) => [id, enabled, order]))} initialRows={widgets} />
    </div>
  );
}
