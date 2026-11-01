import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { CashClosingForm, SealJournalButton } from "../components/gobd-actions";
import { accountingPermissions, accountingSetupPermissions } from "../permissions";
import { getGobdStatus } from "../queries/gobd";
import { berlinToday } from "../utils";

const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10).split("-").reverse().join(".") : "—");

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
      <h2 className="text-small font-semibold uppercase tracking-wide text-default-500">{title}</h2>
      {children}
    </section>
  );
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className={`flex items-center gap-2 text-small ${ok ? "text-success-700" : "text-warning-700"}`}>
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}

/** ACC-7 GoBD: değişmez günlük doğrulaması, tamlık kontrolleri, kasa kapanışı, Z3 ve Verfahrensdoku. */
export async function GobdView() {
  let user;
  try {
    user = await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("accounting.gobd");
  const today = berlinToday();
  const status = await getGobdStatus(today);
  const { journal, checks } = status;
  const canClose = can(user.role, accountingPermissions, "approve");
  const canSeal = can(user.role, accountingSetupPermissions, "update");
  const year = today.getUTCFullYear();
  const download = (href: string, label: string) => (
    <a href={href} download className="inline-flex items-center gap-1.5 rounded-medium border border-default-300 px-3 py-2 text-small font-medium hover:bg-default-100">
      <Download className="h-4 w-4" aria-hidden />
      {label}
    </a>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("journal.title")}>
          {journal.problems.length === 0 ? (
            <Status ok>{t("journal.ok", { entries: journal.entries, bookings: journal.bookings })}</Status>
          ) : journal.unjournaledOnly ? (
            <>
              <Status ok={false}>{t("journal.unjournaled", { count: journal.problems.length })}</Status>
              <p className="text-tiny text-default-500">{t("journal.sealHint")}</p>
              {canSeal ? <SealJournalButton /> : null}
            </>
          ) : (
            <>
              <Status ok={false}>{t("journal.problems", { count: journal.problems.length })}</Status>
              <ul className="list-disc pl-5 text-tiny text-danger-700">
                {journal.problems.slice(0, 20).map((problem, index) => (
                  <li key={index}>{t(`journal.kind.${problem.kind}`, { seq: "seq" in problem ? problem.seq : "", number: "bookingNumber" in problem ? problem.bookingNumber : "" })}</li>
                ))}
              </ul>
            </>
          )}
          <p className="text-tiny text-default-500">{t("journal.hint")}</p>
        </Card>

        <Card title={t("checks.title")}>
          <Status ok={!checks.missingReceipts.length}>{t("checks.receipts", { count: checks.missingReceipts.length })}</Status>
          {checks.missingReceipts.length ? (
            <ul className="flex flex-wrap gap-x-3 gap-y-1 pl-6 text-tiny">
              {checks.missingReceipts.slice(0, 15).map((row) => (
                <li key={row.id}>
                  <Link href={`/muhasebe/${row.id}`} className="text-primary hover:underline">
                    {row.bookingNumber}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Status ok={!checks.sequenceGaps.length}>
            {checks.sequenceGaps.length ? t("checks.gaps", { list: checks.sequenceGaps.map((gap) => `${gap.year}: ${gap.missing.join(", ")}`).join(" · ") }) : t("checks.noGaps")}
          </Status>
          <Status ok={!checks.staleBankLines}>{t("checks.bank", { count: checks.staleBankLines })}</Status>
          <Status ok={!checks.draftPayables}>{t("checks.payables", { count: checks.draftPayables })}</Status>
        </Card>
      </div>

      <Card title={t("cash.title")}>
        {status.cash.length ? (
          status.cash.map((account) => (
            <div key={account.accountId} className="flex flex-col gap-2 border-t border-default-100 pt-3 first:border-0 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-small">
                <span className="font-medium">{account.name}</span>
                <span className="text-default-500">
                  {t("cash.balance", { amount: euro(account.balanceCents) })} · {t("cash.last", { date: day(account.lastClosing) })}
                  {account.lastClosingDifferenceCents ? ` · ${t("cash.difference", { amount: euro(account.lastClosingDifferenceCents) })}` : ""}
                </span>
              </div>
              <Status ok={account.unclosedDays === 0}>{t("cash.unclosed", { count: account.unclosedDays })}</Status>
              {canClose ? <CashClosingForm accountId={account.accountId} defaultDate={today.toISOString().slice(0, 10)} /> : null}
            </div>
          ))
        ) : (
          <p className="text-small text-default-500">{t("cash.none")}</p>
        )}
        <p className="text-tiny text-default-500">{t("cash.hint")}</p>
      </Card>

      <Card title={t("exports.title")}>
        <div className="flex flex-wrap gap-2">
          {download(`/api/accounting/gobd/export?year=${year}`, t("exports.z3", { year }))}
          {download(`/api/accounting/gobd/export?year=${year - 1}`, t("exports.z3", { year: year - 1 }))}
          {download("/api/accounting/gobd/procedure", t("exports.procedure"))}
        </div>
        <p className="text-tiny text-default-500">{t("exports.hint")}</p>
      </Card>
    </div>
  );
}
