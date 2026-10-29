import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { formatMoney } from "@/shared/money";
import { can } from "@/shared/permissions/define";
import { formatDate, formatDateTime } from "@/shared/utils";

import { ConfirmationActionsBar } from "../components/confirmation-actions-bar";
import { donationsPermissions } from "../permissions";
import { getConfirmation } from "../queries/get-confirmation";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-default-100 py-2 last:border-none">
      <span className="text-tiny font-medium uppercase tracking-wide text-default-400">{label}</span>
      <span className="text-small text-foreground">{children}</span>
    </div>
  );
}

/**
 * Bildirim detayı (§ 15 md. 7): değişmez snapshot verisi, ögeler, PDF indirme,
 * iptal (neden) ve iptal edilmiş bildirim için "Yerine yenisini oluştur".
 */
export async function ConfirmationDetailView({ id }: { id: string }) {
  let user;
  try {
    user = await requirePermission(donationsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const confirmation = await getConfirmation(id);
  if (!confirmation) notFound();

  const t = await getTranslations("donations.confirmations");
  const isCancelled = confirmation.status === "CANCELLED";
  const canCancel = !isCancelled && can(user.role, donationsPermissions, "delete");
  const canReissue = isCancelled && !confirmation.replacedById && can(user.role, donationsPermissions, "approve");
  const recipientLink = confirmation.memberId
    ? `/uyeler/${confirmation.memberId}`
    : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`${t("detail.title")} — ${confirmation.confirmationNumber}`}
        description={t("detail.subtitle", {
          kind: t(`kind.${confirmation.kind}`),
          content: t(`content.${confirmation.content}`),
          date: formatDate(confirmation.issuedAt),
        })}
        actions={
          <ConfirmationActionsBar
            id={confirmation.id}
            confirmationNumber={confirmation.confirmationNumber}
            canCancel={canCancel}
            canReissue={canReissue}
          />
        }
      />

      {isCancelled ? (
        <div className="rounded-medium bg-danger-50 px-4 py-3 text-small text-danger dark:bg-danger-500/10">
          <strong>{t("detail.cancelledBanner")}</strong>{" "}
          {t("detail.cancelledInfo", {
            date: confirmation.cancelledAt ? formatDate(confirmation.cancelledAt) : "—",
            label: confirmation.cancelledByLabel ?? "—",
            reason: confirmation.cancelReason ?? "—",
          })}
        </div>
      ) : null}

      {confirmation.voidedPaymentWarning ? (
        <div className="rounded-medium bg-warning-50 px-4 py-3 text-small text-warning-700 dark:bg-warning-500/10">
          {t("voidedWarning", {
            receipt: confirmation.voidedPayments.map((payment) => payment.receiptNumber).join(", "),
          })}
        </div>
      ) : null}

      <div className="grid max-w-4xl grid-cols-1 gap-x-6 rounded-medium border border-default-200 bg-content1 p-5 shadow-sm sm:grid-cols-2">
        <InfoRow label={t("detail.fields.number")}>{confirmation.confirmationNumber}</InfoRow>
        <InfoRow label={t("detail.fields.issuedAt")}>{formatDate(confirmation.issuedAt)}</InfoRow>
        <InfoRow label={t("columns.kind")}>
          {t(`kind.${confirmation.kind}`)} · {t(`content.${confirmation.content}`)}
        </InfoRow>
        <InfoRow label={t("columns.status")}>{t(`status.${confirmation.status}`)}</InfoRow>
        <InfoRow label={t("detail.fields.recipient")}>
          {recipientLink ? (
            <Link href={recipientLink} className="text-primary underline">
              {confirmation.recipientName}
            </Link>
          ) : confirmation.donorNumber !== null ? (
            `${confirmation.recipientName} (SP-${String(confirmation.donorNumber).padStart(4, "0")})`
          ) : (
            confirmation.recipientName
          )}
        </InfoRow>
        <InfoRow label={t("detail.address")}>
          {[
            confirmation.recipientStreet,
            `${confirmation.recipientPostalCode} ${confirmation.recipientCity}`,
            confirmation.recipientCountry,
          ]
            .filter(Boolean)
            .join(", ")}
        </InfoRow>
        <InfoRow label={t("detail.fields.period")}>
          {formatDate(confirmation.periodFrom)} – {formatDate(confirmation.periodTo)}
        </InfoRow>
        <InfoRow label={t("detail.fields.total")}>
          <span className="font-semibold">{formatMoney(confirmation.totalCents)}</span>
        </InfoRow>
        <InfoRow label={t("detail.fields.words")}>
          <em>{confirmation.amountInWords}</em>
        </InfoRow>
        <InfoRow label={t("detail.fields.waived")}>
          {confirmation.waivedReimbursement ? "✓" : "—"}
        </InfoRow>
        <InfoRow label={t("detail.issuedBy")}>
          {confirmation.issuedByLabel} — {formatDateTime(confirmation.issuedAt)}
        </InfoRow>
        <InfoRow label={t("detail.place")}>{confirmation.issuedPlace}</InfoRow>
        <InfoRow label={t("detail.fields.templateVersion")}>{confirmation.templateVersion}</InfoRow>
        <InfoRow label={t("detail.fields.retention")}>
          {confirmation.retentionEndDate ? formatDate(confirmation.retentionEndDate) : "—"}
        </InfoRow>
        {confirmation.replacesId ? (
          <InfoRow label={t("detail.replaces")}>
            <Link href={`/bagislar/bildirimler/${confirmation.replacesId}`} className="text-primary underline">
              {t("actions.view")}
            </Link>
          </InfoRow>
        ) : null}
        {confirmation.replacedById ? (
          <InfoRow label={t("detail.replacedBy")}>
            <Link href={`/bagislar/bildirimler/${confirmation.replacedById}`} className="text-primary underline">
              {t("actions.view")}
            </Link>
          </InfoRow>
        ) : null}
        {confirmation.pdfSha256 ? (
          <InfoRow label={t("detail.pdfHash")}>
            <code className="break-all text-tiny text-default-500">{confirmation.pdfSha256}</code>
          </InfoRow>
        ) : null}
      </div>

      <section className="max-w-4xl rounded-medium border border-default-200 bg-content1 shadow-sm">
        <h2 className="border-b border-default-100 px-5 py-3 text-small font-semibold">
          {t("detail.fields.items")}
        </h2>
        <table className="w-full text-small">
          <thead className="bg-default-50 text-left text-tiny uppercase tracking-wide text-default-500">
            <tr>
              <th className="px-5 py-2">#</th>
              <th className="px-5 py-2">{t("detail.itemDate")}</th>
              <th className="px-5 py-2">{t("detail.itemLabel")}</th>
              <th className="px-5 py-2 text-right">{t("detail.itemAmount")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default-100">
            {confirmation.items.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-2 text-default-500">{item.position}</td>
                <td className="px-5 py-2">{formatDate(item.itemDate)}</td>
                <td className="px-5 py-2">
                  {item.itemType === "DONATION" ? (
                    <Link href={`/bagislar/${item.sourceId}`} className="text-primary underline">
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                </td>
                <td className="px-5 py-2 text-right font-medium">{formatMoney(item.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
