import { getTranslations } from "next-intl/server";
import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { systemPermissions } from "@/shared/permissions/system";

import { BackupPanel } from "../components/backup-panel";
import { getBackupOverview } from "../services/backups";

export async function BackupView() {
  try {
    await requirePermission(systemPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const [t, initialOverview] = await Promise.all([
    getTranslations("system.backups"),
    getBackupOverview(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <BackupPanel initialOverview={initialOverview} />
    </div>
  );
}
