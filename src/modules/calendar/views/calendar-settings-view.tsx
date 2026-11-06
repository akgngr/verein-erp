import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { SyncAppsSettings } from "../components/sync-apps-settings";
import { calendarPermissions } from "../permissions";
import { publicOrigin } from "../services/origin";
import { listAppsForSettings } from "../services/sync";

/** Takvim → Ayarlar: senkron eklentilerinin OAuth uygulamaları (yalnız onay yetkisi). */
export async function CalendarSettingsView() {
  try {
    await requirePermission(calendarPermissions, "approve");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("calendar.sync");
  const apps = await listAppsForSettings(await publicOrigin());
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("settingsTitle")} description={t("settingsDescription")} />
      <SyncAppsSettings apps={apps} />
    </div>
  );
}
