import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { allModules } from "@/registry";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { isAccessApproved } from "@/shared/modules/module-access";
import { systemPermissions } from "@/shared/permissions/system";

import { SetupWizard } from "../components/setup-wizard";
import { getAccessRecords } from "../services/module-access-store";
import { getSetupState, MODULE_PRESETS, ORGANIZATION_TYPES, PRESET_MANAGED_MODULES } from "../services/setup";

/** Kurulum sihirbazı (/ayarlar/kurulum): kurum türüne göre modül ve muhasebe hazır ayarları. */
export async function SetupView() {
  try {
    await requirePermission(systemPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("system.setup");
  const tNav = await getTranslations();
  const [state, records] = await Promise.all([getSetupState(), getAccessRecords()]);
  const modules = PRESET_MANAGED_MODULES.map((key) => allModules.find((module) => module.key === key))
    .filter((module): module is (typeof allModules)[number] => Boolean(module))
    .map((module) => {
      const navKey = `${module.key}.nav.${module.nav?.[0]?.labelKey ?? ""}`;
      return { key: module.key, label: tNav.has(navKey) ? tNav(navKey) : module.label, needsApproval: !isAccessApproved(module, records[module.key]) };
    });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={state.completedAt ? t("descriptionDone") : t("description")} />
      <SetupWizard types={ORGANIZATION_TYPES} presets={MODULE_PRESETS} modules={modules} initialType={state.type} />
    </div>
  );
}
