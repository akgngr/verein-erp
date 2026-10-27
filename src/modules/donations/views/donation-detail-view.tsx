import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatDate, formatDateTime } from "@/shared/utils";
import { can } from "@/shared/permissions/define";

import { getDonation } from "../queries/get-donation";
import { donationsPermissions } from "../permissions";
import { DONATION_METHOD_LABELS } from "../constants";
import { DonationCancelButton } from "../components/donation-cancel-button";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-default-100 py-2 last:border-none">
      <span className="text-tiny font-medium uppercase tracking-wide text-default-400">{label}</span>
      <span className="text-small text-foreground">{children}</span>
    </div>
  );
}

/** Bağış detayı (§ 15 md. 3). */
export async function DonationDetailView({ id }: { id: string }) {
  let user;
  try {
    user = await requirePermission(donationsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const donation = await getDonation(id);
  if (!donation) notFound();
  const t = await getTranslations("donations.detail");
  const tForm = await getTranslations("donations.form");

  const canUpdate = can(user.role, donationsPermissions, "update") && !donation.reversedAt && !donation.hasActiveConfirmationItem;
  const canDelete = can(user.role, donationsPermissions, "delete") && !donation.reversedAt && !donation.hasActiveConfirmationItem;
  const canIssue = can(user.role, donationsPermissions, "approve") && !donation.reversedAt && !donation.hasActiveConfirmationItem;

  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  return (
    <div>
      <PageHeader
        title={donation.donationNumber}
        description={`${donation.donorName} — ${format(donation.amountCents)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <LinkButtonEdit href={`/bagislar/${donation.id}/duzenle`} label={tForm("editTitle")} />
            ) : null}
            {canIssue ? (
              <LinkButtonIssue href={`/bagislar/bildirimler/olustur?kaynak=bagis&bagisci=${donation.donorId}`} label={t("issue")} />
            ) : null}
            {canDelete ? (
              <DonationCancelButton
                donationId={donation.id}
                donationNumber={donation.donationNumber}
                label={t("cancelTitle")}
                reasonLabel={t("cancelReason")}
                hint={t("cancelHint")}
                toastTitle={t("toastCancelled")}
                icon={<Ban className="h-4 w-4" aria-hidden />}
              />
            ) : null}
          </div>
        }
      />

      <div className="max-w-3xl rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
        {donation.reversedAt ? (
          <div className="mb-3 rounded-medium bg-danger-50 px-3 py-2 text-small font-semibold text-danger">
            {t("reverseInfo", {
              date: formatDate(new Date(donation.reversedAt)),
              reason: donation.reverseReason ?? "",
            })}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <InfoRow label={t("fields.number")}>{donation.donationNumber}</InfoRow>
          <InfoRow label={t("fields.date")}>{formatDate(donation.receivedAt)}</InfoRow>
          <InfoRow label={t("fields.donor")}>
            <Link href={`/bagislar/bagiscilar/${donation.donorId}`} className="text-primary underline">
              {donation.donorName} (SP-{String(donation.donorNumber).padStart(4, "0")})
            </Link>
          </InfoRow>
          <InfoRow label={t("fields.amount")}>
            <span className="font-semibold">{format(donation.amountCents)}</span>
          </InfoRow>
          <InfoRow label={t("fields.method")}>{DONATION_METHOD_LABELS[donation.method]}</InfoRow>
          <InfoRow label={t("fields.status")}>
            {donation.reversedAt ? t("reversed") : t("active")}
          </InfoRow>
          <InfoRow label={t("fields.reference")}>{donation.reference ?? "—"}</InfoRow>
          <InfoRow label={t("fields.purposeNote")}>{donation.purposeNote ?? "—"}</InfoRow>
          {donation.waivedReimbursement ? (
            <>
              <InfoRow label={t("fields.waived")}>✓</InfoRow>
              <InfoRow label={t("fields.claimBasis")}>{donation.claimBasis ?? "—"}</InfoRow>
              <InfoRow label={t("fields.waiverDeclaredAt")}>
                {donation.waiverDeclaredAt ? formatDate(donation.waiverDeclaredAt) : "—"}
              </InfoRow>
            </>
          ) : null}
          <InfoRow label={t("fields.booking")}>{donation.bookingNumber ?? "—"}</InfoRow>
          {donation.waiverBookingNumber ? (
            <InfoRow label={t("fields.waiverBooking")}>{donation.waiverBookingNumber}</InfoRow>
          ) : null}
          <InfoRow label={t("fields.confirmation")}>
            {donation.confirmationNumber ? (
              <Link href="/bagislar/bildirimler" className="text-primary underline">
                {donation.confirmationNumber}
                {donation.confirmationCancelled ? ` (${t("reversed")})` : ""}
              </Link>
            ) : (
              "—"
            )}
          </InfoRow>
          <InfoRow label={t("fields.createdBy")}>
            {`${donation.createdByLabel} — ${formatDateTime(donation.createdAt)}`}
          </InfoRow>
        </div>
      </div>
      <div className="mt-4">
        <Link href="/bagislar" className="text-small text-primary underline">
          ← Bağışlar
        </Link>
      </div>
      <span className="hidden">{Pencil.name}</span>
    </div>
  );
}

function LinkButtonEdit({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-medium bg-primary px-3 py-1.5 text-small font-medium text-white"
    >
      <Pencil className="h-4 w-4" aria-hidden />
      {label}
    </a>
  );
}

function LinkButtonIssue({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-medium border border-primary px-3 py-1.5 text-small font-medium text-primary"
    >
      {label}
    </a>
  );
}
