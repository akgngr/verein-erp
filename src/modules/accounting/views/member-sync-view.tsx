import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { getMemberSyncPreview } from "../queries/preview-member-sync";
import { accountingPermissions } from "../permissions";
import { SyncPanel } from "../components/sync-panel";

/** Üyelik aktarımı (§ 11.7): ayar kartı /muhasebe/ayarlar'da; burada önizleme + aktar. */
export async function MemberSyncView() {
  let user;
  try {
    user = await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const preview = await getMemberSyncPreview();
  const t = await getTranslations("accounting.sync");

  const canRun = can(user.role, accountingPermissions, "create");

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <SyncPanel preview={preview} canRun={canRun} />
    </div>
  );
}
