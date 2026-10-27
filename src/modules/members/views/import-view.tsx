import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { membersPermissions } from "../permissions";
import { ImportWizard } from "../components/import-wizard";

/** Üye içe aktarma sayfası (Faz 3 eklemeleri): şablon + iki adımlı sihirbaz. */
export async function ImportView() {
  try {
    await requirePermission(membersPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("members.import");

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <ImportWizard />
    </div>
  );
}
