import { getTranslations } from "next-intl/server";

import { ForbiddenError, getPaymentProfile, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { PayoutsPanel } from "../components/payouts-panel";
import { coursePayoutsAllPermissions, coursePayoutsPermissions } from "../permissions";
import { isValidPeriod } from "../services/payout-calc";
import { listPayouts } from "../services/payouts";

/** Kurslar → Öğretmen hakedişleri (?donem=YYYY-MM). Öğretmen yalnızca kendi kayıtlarını görür. */
export async function PayoutsView({ period: requested }: { period?: string | null }) {
  let user;
  try {
    user = await requirePermission(coursePayoutsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("courses.payouts");
  const now = new Date();
  const fallback = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const period = requested && isValidPeriod(requested) ? requested : fallback;
  const ownOnly = !can(user.role, coursePayoutsAllPermissions, "view");
  const rows = await listPayouts({ period, onlyTeacherUserId: ownOnly ? user.id : null });
  const ownProfileMissing = ownOnly && !(await getPaymentProfile(user.id))?.iban;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={ownOnly ? t("descriptionOwn") : t("description")} />
      {ownProfileMissing ? <p className="rounded-medium bg-warning-50 p-3 text-small text-warning-700">{t("ownProfileMissing")}</p> : null}
      <PayoutsPanel
        period={period}
        canManage={can(user.role, coursePayoutsPermissions, "create")}
        canApprove={can(user.role, coursePayoutsPermissions, "approve")}
        rows={rows.map((row) => ({ ...row, paidAt: row.paidAt?.toISOString() ?? null }))}
      />
    </div>
  );
}
