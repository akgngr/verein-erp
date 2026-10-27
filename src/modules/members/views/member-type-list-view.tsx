import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { memberTypesPermissions } from "../permissions";
import { listMemberTypeConfigs } from "../queries/list-member-types";
import { MemberTypesTable } from "../components/member-types-table";

/**
 * Üyelik türleri ekranı (Faz 3 eklemeleri): yıllık aidat tutarı + aktiflik.
 * KARAR: Tür ekleme/silme yoktur (enum sabittir — bkz. prisma şema karar notu);
 * pasif tür yeni üye kaydında seçilemez, mevcut üyeler etkilenmez.
 */
export async function MemberTypeListView() {
  let user;
  try {
    user = await requirePermission(memberTypesPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const [rows] = await Promise.all([listMemberTypeConfigs()]);
  const t = await getTranslations("members.types");
  const canUpdate = can(user.role, memberTypesPermissions, "update");

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <LinkButton href="/uyeler" variant="flat" startIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}>
            {t("backToMembers")}
          </LinkButton>
        }
      />
      <MemberTypesTable rows={rows} canUpdate={canUpdate} />
    </div>
  );
}
