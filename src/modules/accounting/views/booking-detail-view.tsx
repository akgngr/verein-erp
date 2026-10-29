import Link from "next/link";
import { AccountingEditView } from "./booking-edit-view";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatDate, formatDateTime } from "@/shared/utils";
import { can } from "@/shared/permissions/define";

import { getBooking } from "../queries/get-booking";
import { accountingPermissions } from "../permissions";
import { BookingTypeBadge } from "../components/booking-type-badge";
import { BookingDetailActions } from "../components/booking-detail-actions";
import { FilesPanel } from "../components/files-panel";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-default-100 py-2 last:border-none">
      <span className="text-tiny font-medium uppercase tracking-wide text-default-400">{label}</span>
      <span className="text-small text-foreground">{children}</span>
    </div>
  );
}

/** Fiş detayı (§ 11.3): tüm alanlar + belgeler + aksiyonlar. */
export async function AccountingDetailView({
  id,
  searchParams,
}: {
  id: string;
  /** `?duzenle` → düzenleme çekmecesi. */
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  let user;
  try {
    user = await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const booking = await getBooking(id);
  if (!booking) notFound();
  const t = await getTranslations("accounting");

  const canUpdate = can(user.role, accountingPermissions, "update") && !booking.reversedAt && !booking.sourceType;
  const canDelete = can(user.role, accountingPermissions, "delete") && !booking.reversedAt && !booking.sourceType;
  const canUpload =
    (can(user.role, accountingPermissions, "update") || can(user.role, accountingPermissions, "create")) &&
    !booking.reversedAt;
  const canDeleteFile = can(user.role, accountingPermissions, "delete");

  const formatAmount = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  return (
    <div>
      <PageHeader
        title={booking.bookingNumber}
        description={booking.description}
        actions={
          <BookingDetailActions
            bookingId={booking.id}
            bookingNumber={booking.bookingNumber}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <BookingTypeBadge type={booking.type} />
            {booking.reversedAt ? (
              <span className="rounded-small bg-danger-50 px-2 py-0.5 text-tiny font-semibold text-danger">
                {t("list.columns.reversed")}
              </span>
            ) : null}
            <span className="text-tiny text-default-400">{booking.bookingNumber}</span>
          </div>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <InfoRow label={t("detail.fields.date")}>{formatDate(booking.bookingDate)}</InfoRow>
            <InfoRow label={t("detail.fields.amount")}>
              <span className={booking.type === "EXPENSE" ? "font-semibold text-danger" : booking.type === "INCOME" ? "font-semibold text-success" : "font-semibold"}>
                {formatAmount(booking.amountCents)}
              </span>
            </InfoRow>
            <InfoRow label={t("detail.fields.account")}>
              {booking.transferLine ?? booking.accountName}
            </InfoRow>
            <InfoRow label={t("detail.fields.category")}>{booking.categoryName ?? "—"}</InfoRow>
            <InfoRow label={t("detail.fields.project")}>{booking.project ?? "—"}</InfoRow>
            <InfoRow label={t("detail.fields.counterparty")}>{booking.counterparty ?? "—"}</InfoRow>
            <InfoRow label={t("detail.fields.receiptReference")}>{booking.receiptReference ?? "—"}</InfoRow>
            <InfoRow label={t("detail.fields.source")}>
              {booking.sourceType
                ? (t.has(`enums.sourceType.${booking.sourceType}`)
                    ? t(`enums.sourceType.${booking.sourceType}`)
                    : booking.sourceType)
                : t("detail.sourceManual")}
            </InfoRow>
            <InfoRow label={t("detail.fields.createdBy")}>
              {`${booking.createdByLabel} — ${formatDateTime(booking.createdAt)}`}
            </InfoRow>
            <InfoRow label={t("detail.fields.updatedBy")}>
              {booking.updatedByLabel ? `${booking.updatedByLabel} — ${formatDateTime(booking.updatedAt)}` : "-"}
            </InfoRow>
          </div>

          {booking.reversedAt ? (
            <div className="mt-4 rounded-medium border border-danger-200 bg-danger-50 px-4 py-3">
              <p className="text-small font-semibold text-danger">
                {t("detail.fields.reverseInfo")} — {t("detail.reversedBy", {
                  label: booking.reverseReason ?? "",
                  date: formatDate(new Date(booking.reversedAt)),
                })}
              </p>
            </div>
          ) : null}
        </div>

        <FilesPanel
          bookingId={booking.id}
          files={booking.files}
          canUpdate={canUpload}
          canDelete={canDeleteFile}
        />

        <div className="lg:col-span-3">
          <Link href="/muhasebe" className="text-small text-primary underline">
            ← {t("list.title")}
          </Link>
        </div>
      </div>
      {canUpdate && (await searchParams)?.duzenle !== undefined ? <AccountingEditView id={booking.id} /> : null}
    </div>
  );
}
