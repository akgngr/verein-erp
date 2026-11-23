import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { SubscribersManager } from "../components/subscribers-manager";
import { notificationsPermissions } from "../permissions";

export async function SubscribersView() {
  try {
    await requirePermission(notificationsPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("notifications.ui.subscribers");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <SubscribersManager idPrefix="notifications-subscribers" />
    </div>
  );
}
