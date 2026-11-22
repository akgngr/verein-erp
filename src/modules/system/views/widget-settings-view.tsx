import { getTranslations } from "next-intl/server";

import { requirePermission } from "@/modules/auth/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { getWidgetSettings } from "@/modules/widgets/server";
import { widgetsPermissions } from "@/modules/widgets";
import { PageHeader } from "@/shared/components/ui/page-header";

import { WidgetSettingsForm } from "../components/widget-settings-form";

export async function WidgetSettingsView() {
  const user = await requirePermission(widgetsPermissions, "view");
  const [rows, t, root] = await Promise.all([
    listUsableModuleKeys().then((keys) => getWidgetSettings(user, keys)),
    getTranslations("system.ui.widgets"),
    getTranslations(),
  ]);
  const items = rows.map((row) => ({ ...row, title: root.has(row.titleKey) ? root(row.titleKey) : row.id }))
    .sort((a, b) => a.slot.localeCompare(b.slot) || a.order - b.order || a.id.localeCompare(b.id));
  return (
    <section className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <WidgetSettingsForm key={JSON.stringify(items.map(({ id, enabled, order, title }) => [id, enabled, order, title]))} initialRows={items} labels={{
        empty: t("empty"), mandatory: t("mandatory"), optional: t("optional"), adminDisabled: t("adminDisabled"),
        enable: t("enable"), disable: t("disable"), up: t("up"), down: t("down"),
        reset: t("reset"), changed: t("changed"), error: t("error"),
        desktop: t("desktop"), mobile: t("mobile"), preview: t("preview"),
      }} />
    </section>
  );
}
