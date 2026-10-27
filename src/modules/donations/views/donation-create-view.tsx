import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { listActiveCategoryOptions } from "@/modules/accounting/server";

import { listDonors } from "../queries/list-donors";
import { donationsPermissions } from "../permissions";
import { DonationForm } from "../components/donation-form";

/** Yeni bağış (§ 15 md. 2). */
export async function DonationCreateView() {
  try {
    await requirePermission(donationsPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const [donorRows, expenseCategories] = await Promise.all([
    listDonors(
      {
        page: 1,
        pageSize: 50 as const,
        q: "",
        sort: "donorNumber",
        dir: "asc" as const,
        filters: { active: "1" },
        skip: 0,
        take: 500,
      },
    ),
    listActiveCategoryOptions("EXPENSE"),
  ]);
  const t = await getTranslations("donations.form");

  return (
    <div>
      <PageHeader title={t("createTitle")} description={""} />
      <DonationForm
        mode="create"
        donors={donorRows.rows.map((row) => ({
          id: row.id,
          donorNumber: row.donorNumber,
          label: `SP-${String(row.donorNumber).padStart(4, "0")} — ${row.displayName}`,
        }))}
        expenseCategories={expenseCategories}
      />
    </div>
  );
}
