import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { getBooking } from "../queries/get-booking";
import { listAccountOptions } from "../queries/list-accounts";
import { listCategoryOptions } from "../queries/list-categories";
import { listProjectOptions } from "../queries/list-projects";
import { accountingPermissions } from "../permissions";
import { BookingForm } from "../components/booking-form";
import { getTaxSettings } from "../services/tax";
import { getDb } from "@/shared/db";

/** Fiş düzenleme (§ 11.2): ters/kilitli/kaynak fişlerde açıklayıcı engel. */
export async function AccountingEditView({ id }: { id: string }) {
  try {
    await requirePermission(accountingPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <FormDrawer title="">{<AccessDenied />}</FormDrawer>;
    throw error;
  }

  const [booking, accounts, categories, projects, taxSettings] = await Promise.all([
    getBooking(id),
    listAccountOptions(),
    listCategoryOptions(),
    listProjectOptions(),
    getTaxSettings(getDb()),
  ]);
  if (!booking) notFound();
  const t = await getTranslations("accounting.form");

  const blocked =
    booking.reversedAt
      ? t("editBlockedReversed")
      : booking.sourceType
        ? t("editBlockedSource")
        : null;

  if (blocked) {
    return (
      <FormDrawer title={t("editTitle")} description={booking.bookingNumber}>
        <div className="rounded-medium border border-warning-300 bg-warning-50 px-4 py-3 text-small text-warning-700">
          {blocked}
        </div>
      </FormDrawer>
    );
  }

  return (
    <FormDrawer title={t("editTitle")} description={booking.bookingNumber}>
      <BookingForm
        mode="edit"
        smallBusiness={taxSettings.smallBusiness}
        accounts={accounts}
        categories={categories}
        projects={projects}
        initial={{
          type: booking.type,
          bookingDate:
            booking.bookingDate instanceof Date
              ? booking.bookingDate.toISOString().slice(0, 10)
              : String(booking.bookingDate),
          accountId: booking.accountId,
          counterAccountId: booking.counterAccountId ?? "",
          categoryId: booking.categoryId ?? "",
          projectId: booking.projectId ?? "",
          amount: (booking.amountCents / 100).toFixed(2),
          taxRate: String(booking.taxRate),
          description: booking.description,
          counterparty: booking.counterparty ?? "",
          receiptReference: booking.receiptReference ?? "",
          id: booking.id,
          updatedAt: new Date(booking.updatedAt).toISOString(),
        }}
      />
    </FormDrawer>
  );
}
