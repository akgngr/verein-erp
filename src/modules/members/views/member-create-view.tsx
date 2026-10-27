import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { getTranslations } from "next-intl/server";

import { membersPermissions } from "../permissions";
import { MemberForm } from "../components/member-form";

/** Yeni üye kayıt sayfası. Üyelik numarası sunucuda üretilir. */
export async function MemberCreateView() {
  try {
    await requirePermission(membersPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("members");

  return (
    <div>
      <PageHeader
        title={t("createTitle")}
        description={t("createDescription")}
      />
      <MemberForm mode="create" />
    </div>
  );
}
