import { NotebookPen } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";

import { secretaryPermissions } from "../permissions";

/** S0 iskeleti: özet ve öneriler S1/S2'de (T1.4, T2.2) bu sayfaya gelir. */
export async function SecretaryHomeView() {
  try {
    await requirePermission(secretaryPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("secretary");
  return (
    <section className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState icon={NotebookPen} title={t("empty.title")} description={t("empty.description")} />
    </section>
  );
}
