import { Trash2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { BankImportCard } from "../components/bank-import-card";
import { BankRuleDeleteButton } from "../components/bank-rule-delete-button";
import { BankTransactionList } from "../components/bank-transaction-list";
import { accountingPermissions } from "../permissions";
import { listBankRules, listBankTransactions, listOpenInvoiceOptions } from "../queries/bank";
import { getInvoiceSettings } from "../queries/invoices";
import { listOpenPayables } from "../queries/payables";
import { listAccountOptions } from "../queries/list-accounts";
import { listCategoryOptions } from "../queries/list-categories";

const STATUSES = ["OPEN", "BOOKED", "PRIVATE", "IGNORED"] as const;

/** ACC-4 Banka: ekstre içe aktarma, eşleştirme önerileri, öğrenilmiş kurallar. */
export async function BankView({ status }: { status: (typeof STATUSES)[number] }) {
  let user;
  try {
    user = await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("accounting.bank");
  const canEdit = can(user.role, accountingPermissions, "create");
  const [{ rows, counts }, accounts, categories, invoices, rules, settings] = await Promise.all([
    listBankTransactions({ status }),
    listAccountOptions(),
    listCategoryOptions(),
    status === "OPEN" ? listOpenInvoiceOptions() : [],
    listBankRules(),
    getInvoiceSettings(),
  ]);
  const payables = status === "OPEN" ? await listOpenPayables() : [];
  const options = (direction: "INCOME" | "EXPENSE") => categories.filter((category) => category.direction === direction).map((category) => ({ value: category.id, label: category.name }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      {canEdit ? <BankImportCard accounts={accounts.map((account) => ({ value: account.id, label: account.name }))} /> : null}
      <nav className="flex flex-wrap gap-2 text-small">
        {STATUSES.map((key) => (
          <Link key={key} href={`/muhasebe/banka?durum=${key.toLowerCase()}`} className={`rounded-medium px-3 py-1.5 ${status === key ? "bg-primary text-white" : "border border-default-200"}`}>
            {t(`status.${key}`)} ({counts[key]})
          </Link>
        ))}
      </nav>
      <BankTransactionList
        rows={rows}
        canEdit={canEdit}
        incomeCategories={options("INCOME")}
        expenseCategories={options("EXPENSE")}
        invoices={invoices}
        payables={payables.map((payable) => ({ value: payable.id, label: `${payable.number ?? "—"} · ${payable.supplierName}`, openCents: payable.openCents }))}
        defaultIncomeCategoryId={settings.incomeCategoryId}
      />
      {rules.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-small font-semibold uppercase tracking-wide text-default-500">{t("rules.title")}</h2>
          <ul className="flex flex-col divide-y divide-default-100 rounded-medium border border-default-200 bg-content1 text-small">
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span>
                  {t(`rules.field.${rule.field}`)} „{rule.pattern}“ → {rule.categoryName} · {rule.taxRate} % <span className="text-tiny text-default-400">({t("rules.hits", { count: rule.hits })})</span>
                </span>
                {canEdit ? <BankRuleDeleteButton id={rule.id} label={t("rules.delete")} icon={<Trash2 className="h-4 w-4" aria-hidden />} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-tiny text-default-500">{t("note")}</p>
    </div>
  );
}
