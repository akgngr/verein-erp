import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { getBudget } from "../queries/get-budget";
import { listYearsWithBookings } from "../queries/list-years";
import { accountingSetupPermissions } from "../permissions";
import { BudgetEditor } from "../components/budget-editor";

/** Bütçe (§ 11.5): ?filter.year= — plan/gerçekleşen, önceki yıldan kopyala. */
export async function BudgetView({ year }: { year: number }) {
  let user;
  try {
    user = await requirePermission(accountingSetupPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const [lines, previousLines, years] = await Promise.all([
    getBudget(year),
    getBudget(year - 1),
    listYearsWithBookings(),
  ]);
  const t = await getTranslations("accounting.budget");

  const canUpdate = can(user.role, accountingSetupPermissions, "update");
  const locked = years.find((row) => row.year === year)?.lockedAt ?? null;

  return (
    <div>
      <PageHeader title={t("title")} description={String(year)} />
      <BudgetEditor
        year={year}
        lines={lines}
        canEdit={canUpdate}
        locked={Boolean(locked)}
        previousYearLines={previousLines}
      />
    </div>
  );
}
