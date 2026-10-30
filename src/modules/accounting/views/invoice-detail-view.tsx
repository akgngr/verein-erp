import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawer } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import type { RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";
import { formatDate, formatDateTime } from "@/shared/utils";

import { InvoiceActions } from "../components/invoice-actions";
import { InvoiceForm } from "../components/invoice-form";
import { InvoiceStatusChip } from "../components/invoice-table";
import { accountingPermissions } from "../permissions";
import { getInvoice, getInvoiceSettings } from "../queries/invoices";
import { listAccountOptions } from "../queries/list-accounts";
import { listCategoryOptions } from "../queries/list-categories";

const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-default-100 py-2 last:border-none">
      <span className="text-tiny font-medium uppercase tracking-wide text-default-400">{label}</span>
      <span className="whitespace-pre-line text-small text-foreground">{children}</span>
    </div>
  );
}

/** Fatura / proforma detayı: kalemler, toplamlar, durum geçmişi ve aksiyonlar. */
export async function InvoiceDetailView({ id, searchParams }: { id: string; searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  const raw = await searchParams;
  const t = await getTranslations("accounting.invoices");
  const permissions = {
    create: can(user.role, accountingPermissions, "create"),
    update: can(user.role, accountingPermissions, "update"),
    delete: can(user.role, accountingPermissions, "delete"),
  };
  const editing = Boolean(raw.duzenle) && invoice.status === "DRAFT" && permissions.update;
  const [accounts, categories, settings] = await Promise.all([listAccountOptions(), listCategoryOptions("INCOME"), getInvoiceSettings()]);
  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.name }));

  return (
    <div>
      <PageHeader
        title={`${t(`kind.${invoice.kind}`)} ${invoice.number ?? t("draftNumber")}`}
        description={invoice.recipientName}
        actions={
          <InvoiceActions
            invoice={invoice}
            can={permissions}
            accountOptions={accounts.map((account) => ({ value: account.id, label: account.name }))}
            categoryOptions={categoryOptions}
          />
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="overflow-x-auto rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
            <table className="w-full text-small">
              <thead className="text-tiny uppercase text-default-400">
                <tr>
                  <th className="pb-2 text-left">{t("form.lineDescription")}</th>
                  <th className="pb-2 text-right">{t("form.quantity")}</th>
                  <th className="pb-2 text-right">{t("form.unitPrice")}</th>
                  <th className="pb-2 text-right">{t("form.taxRate")}</th>
                  <th className="pb-2 text-right">{t("columns.gross")}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="border-t border-default-100">
                    <td className="py-2">{line.description}</td>
                    <td className="py-2 text-right">
                      {line.quantity.toLocaleString("de-DE")} {line.unit ?? ""}
                    </td>
                    <td className="py-2 text-right">{euro(line.unitPriceCents)}</td>
                    <td className="py-2 text-right">{line.taxRate} %</td>
                    <td className="py-2 text-right">{euro(line.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ml-auto mt-3 flex max-w-xs flex-col gap-1 text-small">
              <div className="flex justify-between"><span>{t("form.net")}</span><span>{euro(invoice.netCents)}</span></div>
              {invoice.taxCents > 0 ? (
                <div className="flex justify-between"><span>{t("taxTotal")}</span><span>{euro(invoice.taxCents)}</span></div>
              ) : null}
              <div className="flex justify-between border-t border-default-200 pt-1 font-semibold"><span>{t("form.gross")}</span><span>{euro(invoice.grossCents)}</span></div>
            </div>
          </div>
        </div>
        <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
          <div className="mb-2">
            <InvoiceStatusChip status={invoice.status} overdue={invoice.overdue} />
          </div>
          <Info label={t("form.issueDate")}>{formatDate(invoice.issueDate)}</Info>
          {invoice.dueDate ? <Info label={t("form.dueDate")}>{formatDate(invoice.dueDate)}</Info> : null}
          {invoice.serviceDate ? <Info label={t("form.serviceDate")}>{invoice.serviceDate}</Info> : null}
          <Info label={t("form.recipientTitle")}>
            {[invoice.recipientName, invoice.recipientAddress, invoice.recipientEmail].filter(Boolean).join("\n")}
          </Info>
          {invoice.subject ? <Info label={t("form.subject")}>{invoice.subject}</Info> : null}
          {invoice.taxNote ? <Info label={t("form.taxNote")}>{invoice.taxNote}</Info> : null}
          {invoice.sourceProformaId ? (
            <Info label={t("fromProforma")}>
              <Link className="text-primary hover:underline" href={`/muhasebe/faturalar/${invoice.sourceProformaId}`}>
                {invoice.sourceProformaNumber}
              </Link>
            </Info>
          ) : null}
          {invoice.bookingId ? (
            <Info label={t("paymentBooking")}>
              <Link className="text-primary hover:underline" href={`/muhasebe/${invoice.bookingId}`}>
                {invoice.bookingNumber}
              </Link>
              {invoice.paidAt ? ` — ${formatDate(invoice.paidAt)}` : ""}
            </Info>
          ) : null}
          {invoice.cancelledAt ? (
            <Info label={t("cancelled")}>{`${formatDateTime(invoice.cancelledAt)} — ${invoice.cancelReason ?? ""}`}</Info>
          ) : null}
          <Info label={t("createdBy")}>{`${invoice.createdByLabel} — ${formatDateTime(invoice.createdAt)}`}</Info>
        </div>
      </div>
      {editing ? (
        <FormDrawer title={t("form.editTitle")}>
          <InvoiceForm invoice={invoice} settings={settings} categoryOptions={categoryOptions} />
        </FormDrawer>
      ) : null}
    </div>
  );
}
