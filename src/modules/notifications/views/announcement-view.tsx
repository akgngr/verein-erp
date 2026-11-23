import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { listRoleDirectory } from "@/modules/users/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { AnnouncementForm } from "../components/announcement-form";
import { notificationsPermissions } from "../permissions";

export async function AnnouncementView() {
  try {
    await requirePermission(notificationsPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const [t, directory] = await Promise.all([
    getTranslations("notifications.ui.announcement"),
    listRoleDirectory(),
  ]);
  const roles = directory.filter((role) => role.available).map((role) => ({
    key: role.key,
    label: role.label ?? role.key,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <AnnouncementForm roles={roles} />
    </div>
  );
}
