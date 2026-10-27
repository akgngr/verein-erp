import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { formatDateTime } from "@/shared/utils";

import { listYearsWithBookings } from "../queries/list-years";
import { accountingPermissions } from "../permissions";
import { YearClosingTable } from "../components/year-closing-table";

/** Yıl kapanışı (§ 11.6): fişi olan yıllar + geçerli yıl; kapat/aç aksiyonları. */
export async function YearClosingView() {
  let user;
  try {
    user = await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const rows = await listYearsWithBookings();
  const t = await getTranslations("accounting.years");

  const canApprove = can(user.role, accountingPermissions, "approve");

  // KARAR: RSC → Client bileşene fonksiyon geçilemez; kilit etiketi burada
  // hazırlanır (who + when birleşik metin).
  const years = rows.map((row) => ({
    ...row,
    lockedByFormatted:
      row.lockedAt && row.lockedByLabel
        ? `${row.lockedByLabel} — ${formatDateTime(new Date(row.lockedAt))}`
        : null,
  }));

  return (
    <div>
      <PageHeader title={t("title")} description={""} />
      <YearClosingTable years={years} canApprove={canApprove} />
    </div>
  );
}
