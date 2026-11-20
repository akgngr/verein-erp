import { getTranslations } from "next-intl/server";
import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { notificationsPermissions } from "./permissions";
import { NotificationPreferencesForm } from "./components/preferences-form";
import { NotificationChannelLinks } from "./components/channel-links";

export default async function NotificationSettingsPage() {
  try {
    await requirePermission(notificationsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("notifications");
  return <section className="space-y-6">
    <PageHeader title={t("ui.preferencesTitle")} description={t("ui.preferencesDescription")} />
    <NotificationPreferencesForm />
    <NotificationChannelLinks />
  </section>;
}
