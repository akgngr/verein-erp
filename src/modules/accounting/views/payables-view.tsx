import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { PayableActions } from "../components/payable-actions";
import { PayableForm } from "../components/payable-form";
import { PayableUploadButton } from "../components/payable-upload-button";
import { accountingPermissions } from "../permissions";
import { listAccountOptions } from "../queries/list-accounts";
import { listCategoryOptions } from "../queries/list-categories";
import { getPayable, listPayables, listSupplierOptions } from "../queries/payables";

const STATUSES = ["DRAFT", "OPEN", "PAID", "CANCELLED"] as const;
const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10).split("-").reverse().join(".") : "—");

async function guard() {
  try {
    return await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return null;
    throw error;
  }
}

/** ACC-5 gelen faturalar listesi: yükle, durum sekmeleri, vade/açık tutar. */
export async function PayablesView({ status }: { status: (typeof STATUSES)[number] | null }) {
  const user = await guard();
  if (!user) return <AccessDenied />;
  const t = await getTranslations("accounting.payables");
  const { rows, counts } = await listPayables(status ?? undefined);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} actions={can(user.role, accountingPermissions, "create") ? <PayableUploadButton /> : null} />
      <nav className="flex flex-wrap gap-2 text-small">
        <Link href="/muhasebe/gelen-faturalar" className={`rounded-medium px-3 py-1.5 ${status === null ? "bg-primary text-white" : "border border-default-200"}`}>
          {t("status.ALL")}
        </Link>
        {STATUSES.map((key) => (
          <Link key={key} href={`/muhasebe/gelen-faturalar?durum=${key.toLowerCase()}`} className={`rounded-medium px-3 py-1.5 ${status === key ? "bg-primary text-white" : "border border-default-200"}`}>
            {t(`status.${key}`)} ({counts[key]})
          </Link>
        ))}
      </nav>
      {rows.length ? (
        <div className="overflow-x-auto rounded-medium border border-default-200 bg-content1">
          <table className="w-full text-small">
            <thead className="text-left text-tiny uppercase text-default-500">
              <tr>
                <th className="p-3">{t("columns.supplier")}</th>
                <th className="p-3">{t("columns.number")}</th>
                <th className="p-3">{t("columns.issueDate")}</th>
                <th className="p-3">{t("columns.dueDate")}</th>
                <th className="p-3">{t("columns.status")}</th>
                <th className="p-3 text-right">{t("columns.gross")}</th>
                <th className="p-3 text-right">{t("columns.open")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-default-100">
                  <td className="p-3">
                    <Link href={`/muhasebe/gelen-faturalar/${row.id}`} className="text-primary hover:underline">
                      {row.supplierName || t("unnamed")}
                    </Link>
                    {row.source !== "MANUAL" ? <span className="ml-2 rounded-small bg-success-50 px-1.5 py-0.5 text-tiny text-success-700">{row.source}</span> : null}
                  </td>
                  <td className="p-3">{row.number ?? "—"}</td>
                  <td className="p-3">{day(row.issueDate)}</td>
                  <td className={`p-3 ${row.overdue ? "font-semibold text-danger" : ""}`}>{day(row.dueDate)}</td>
                  <td className="p-3">{t(`status.${row.status}`)}</td>
                  <td className="p-3 text-right tabular-nums">{euro(row.grossCents)}</td>
                  <td className="p-3 text-right tabular-nums">{row.openCents ? euro(row.openCents) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-medium border border-dashed border-default-300 p-6 text-center text-small text-default-500">{t("empty")}</p>
      )}
    </div>
  );
}

/** ACC-5 gelen fatura detayı: belge, § 14 kontrol listesi, form (taslak/düzenle), ödeme fişleri. */
export async function PayableDetailView({ id, editing }: { id: string; editing: boolean }) {
  const user = await guard();
  if (!user) return <AccessDenied />;
  const t = await getTranslations("accounting.payables");
  const payable = await getPayable(id);
  if (!payable) notFound();
  const canCreate = can(user.role, accountingPermissions, "create");
  const showForm = canCreate && (payable.status === "DRAFT" || (editing && payable.status === "OPEN" && payable.paidCents === 0));
  const [suppliers, categories, accounts] = await Promise.all([
    showForm ? listSupplierOptions() : [],
    showForm ? listCategoryOptions("EXPENSE") : [],
    listAccountOptions(),
  ]);
  const fileHref = `/api/accounting/payables/${payable.id}/file`;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={payable.supplierName || t("unnamed")}
        description={[payable.number, t(`status.${payable.status}`), payable.source !== "MANUAL" ? payable.source : null].filter(Boolean).join(" · ")}
        actions={<PayableActions payable={payable} accounts={accounts.map((account) => ({ value: account.id, label: account.name }))} can={{ create: canCreate, delete: can(user.role, accountingPermissions, "delete") }} />}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-medium border border-default-200 bg-content1 p-5 shadow-sm lg:col-span-2">
          {showForm ? (
            <>
              {payable.status === "DRAFT" ? <p className="rounded-medium bg-primary-50 p-3 text-small text-primary-700">{payable.source === "MANUAL" ? t("draftManual") : t("draftEInvoice")}</p> : null}
              <PayableForm payable={payable} suppliers={suppliers} categories={categories.map((category) => ({ value: category.id, label: category.name }))} />
            </>
          ) : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-small sm:grid-cols-2">
              <Info label={t("form.number")}>{payable.number ?? "—"}</Info>
              <Info label={t("form.category")}>{payable.categoryName ?? "—"}</Info>
              <Info label={t("form.issueDate")}>{day(payable.issueDate)}</Info>
              <Info label={t("form.dueDate")}>{day(payable.dueDate)}</Info>
              <Info label={t("form.serviceDate")}>{payable.serviceDate ?? "—"}</Info>
              <Info label={t("form.supplierVatId")}>{payable.supplierVatId ?? payable.supplierTaxNumber ?? "—"}</Info>
              <Info label={t("form.supplierAddress")}>{payable.supplierAddress ?? "—"}</Info>
              <Info label={t("form.supplierIban")}>{payable.supplierIban ?? "—"}</Info>
              <div className="sm:col-span-2">
                <table className="w-full max-w-sm text-small">
                  <tbody>
                    {payable.byRate.map((group) => (
                      <tr key={group.rate}>
                        <td className="py-0.5">{t("rateLine", { rate: group.rate })}</td>
                        <td className="py-0.5 text-right tabular-nums">{euro(group.netCents)}</td>
                        <td className="py-0.5 text-right tabular-nums text-default-500">+ {euro(group.taxCents)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-default-200 font-semibold">
                      <td className="py-1">{t("columns.gross")}</td>
                      <td />
                      <td className="py-1 text-right tabular-nums">{euro(payable.grossCents)}</td>
                    </tr>
                    {payable.paidCents ? (
                      <tr className="text-success">
                        <td className="py-0.5">{t("paidTotal")}</td>
                        <td />
                        <td className="py-0.5 text-right tabular-nums">− {euro(payable.paidCents)}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {payable.notes ? <Info label={t("form.notes")}>{payable.notes}</Info> : null}
            </dl>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <section className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
            <h3 className="mb-2 text-small font-semibold">{t("document")}</h3>
            {payable.originalName ? (
              <a href={`${fileHref}?inline=1`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-small text-primary hover:underline">
                <FileText className="h-4 w-4" aria-hidden />
                {payable.originalName}
              </a>
            ) : (
              <p className="text-small text-default-500">—</p>
            )}
          </section>
          <section className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
            <h3 className="mb-1 text-small font-semibold">{t("checks.title")}</h3>
            <p className="mb-2 text-tiny text-default-500">{payable.grossCents <= 25000 ? t("checks.small") : t("checks.hint")}</p>
            <ul className="flex flex-col gap-1 text-small">
              {payable.checks.map((check) => (
                <li key={check.key} className={`flex items-center gap-2 ${check.ok ? "text-success-700" : "text-warning-700"}`}>
                  {check.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
                  {t(`checks.${check.key}`)}
                </li>
              ))}
            </ul>
          </section>
          {payable.bookings.length ? (
            <section className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
              <h3 className="mb-2 text-small font-semibold">{t("bookings")}</h3>
              <ul className="flex flex-col gap-1 text-small">
                {payable.bookings.map((booking) => (
                  <li key={booking.id} className={`flex justify-between ${booking.reversed ? "text-default-400 line-through" : ""}`}>
                    <Link href={`/muhasebe/${booking.id}`} className="text-primary hover:underline">
                      {booking.bookingNumber}
                    </Link>
                    <span>{day(booking.bookingDate)}</span>
                    <span className="tabular-nums">{euro(booking.amountCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="text-tiny text-default-400">{t("createdBy", { label: payable.createdByLabel, date: day(payable.createdAt) })}</p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-tiny uppercase text-default-400">{label}</dt>
      <dd className="whitespace-pre-line">{children}</dd>
    </div>
  );
}
