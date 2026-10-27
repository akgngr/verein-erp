import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { listActiveCategoryOptions } from "@/modules/accounting/server";

import { getDonation } from "../queries/get-donation";
import { listDonors } from "./list-donors";
import { donationsPermissions } from "../permissions";
import { DonationForm } from "../components/donation-form";

/** Bağış düzenleme (§ 11 md. 6): ters/aktif bildirimli engelli. */
export async function DonationEditView({ id }: { id: string }) {
  let user;
  try {
    user = await requirePermission(donationsPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  void user;

  const [donation, donorRows, expenseCategories] = await Promise.all([
    getDonation(id),
    listDonors({
      page: 1,
      pageSize: 500 as const,
      q: "",
      sort: "donorNumber",
      dir: "asc" as const,
      filters: {},
      skip: 0,
      take: 500,
    }),
    listActiveCategoryOptions("EXPENSE"),
  ]);
  if (!donation) notFound();
  const t = await getTranslations("donations.form");

  const blocked = donation.reversedAt || donation.hasActiveConfirmationItem;

  return (
    <div>
      <PageHeader title={t("editTitle")} description={donation.donationNumber} />
      {blocked ? (
        <div className="max-w-3xl rounded-medium border border-warning-300 bg-warning-50 px-4 py-3 text-small text-warning-700">
          {t("editBlocked")}
        </div>
      ) : (
        <DonationForm
          mode="edit"
          donors={donorRows.rows.map((row) => ({
            id: row.id,
            donorNumber: row.donorNumber,
            label: `SP-${String(row.donorNumber).padStart(4, "0")} — ${row.displayName}`,
          }))}
          expenseCategories={expenseCategories}
          initial={{
            donorId: donation.donorId,
            receivedAt:
              donation.receivedAt instanceof Date
                ? donation.receivedAt.toISOString().slice(0, 10)
                : String(donation.receivedAt),
            amount: (donation.amountCents / 100).toFixed(2),
            method: donation.method,
            reference: donation.reference ?? "",
            purposeNote: donation.purposeNote ?? "",
            waivedReimbursement: donation.waivedReimbursement,
            claimBasis: donation.claimBasis ?? "",
            waiverDeclaredAt: donation.waiverDeclaredAt
              ? donation.waiverDeclaredAt.toISOString().slice(0, 10)
              : "",
            expenseCategoryId: donation.expenseCategoryId ?? "",
            id: donation.id,
            updatedAt: new Date(donation.updatedAt).toISOString(),
          }}
        />
      )}
    </div>
  );
}
