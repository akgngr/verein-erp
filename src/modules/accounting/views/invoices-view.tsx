import { FilePlus2, FileSignature, FileText, Settings2 } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawer, FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";
import type { RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { InvoiceForm } from "../components/invoice-form";
import { InvoiceSettingsForm } from "../components/invoice-settings-form";
import { InvoiceTable } from "../components/invoice-table";
import { accountingPermissions, accountingSetupPermissions } from "../permissions";
import { getInvoice, getInvoiceSettings, listInvoices } from "../queries/invoices";
import { listCategoryOptions } from "../queries/list-categories";
import { listCustomerOptions } from "../queries/contacts";
import { listOpenItems } from "../queries/invoices";
import { OpenItemsTable } from "../components/open-items-table";
import { berlinToday } from "../utils";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Faturalar ve proformalar: liste + yeni / düzenle / ayarlar çekmeceleri. */
export async function InvoicesView({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const raw = await searchParams;
  const t = await getTranslations("accounting.invoices");
  const canCreate = can(user.role, accountingPermissions, "create");
  const canUpdate = can(user.role, accountingPermissions, "update");
  const canSettings = can(user.role, accountingSetupPermissions, "update");
  const newParam = first(raw.yeni);
  const editId = first(raw.duzenle);
  const needsForm = newParam !== undefined || Boolean(editId);

  const view = first(raw.gorunum) === "opos" ? "opos" : "list";
  const [rows, settings, categories, editing, contacts, openItems] = await Promise.all([
    view === "list" ? listInvoices({ kind: first(raw.kind), status: first(raw.status), q: first(raw.q) }) : [],
    getInvoiceSettings(),
    needsForm ? listCategoryOptions("INCOME") : [],
    editId ? getInvoice(editId) : null,
    needsForm ? listCustomerOptions() : [],
    view === "opos" ? listOpenItems(berlinToday()) : [],
  ]);
  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.name }));

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canCreate ? (
              <>
                <FormDrawerButton param="yeni" value="fatura" startIcon={<FilePlus2 className="h-4 w-4" />}>
                  {t("newInvoice")}
                </FormDrawerButton>
                <FormDrawerButton param="yeni" value="proforma" color="secondary" startIcon={<FileText className="h-4 w-4" />}>
                  {t("newProforma")}
                </FormDrawerButton>
                <FormDrawerButton param="yeni" value="teklif" variant="flat" startIcon={<FileSignature className="h-4 w-4" />}>
                  {t("newQuote")}
                </FormDrawerButton>
              </>
            ) : null}
            {canSettings ? (
              <FormDrawerButton param="yeni" value="ayarlar" variant="bordered" color="default" startIcon={<Settings2 className="h-4 w-4" />}>
                {t("settings.title")}
              </FormDrawerButton>
            ) : null}
          </div>
        }
      />
      <nav className="mb-4 flex flex-wrap gap-2 text-small">
        <Link href="/muhasebe/faturalar" className={`rounded-medium px-3 py-1.5 ${view === "list" ? "bg-primary text-white" : "border border-default-200"}`}>
          {t("views.list")}
        </Link>
        <Link href="/muhasebe/faturalar?gorunum=opos" className={`rounded-medium px-3 py-1.5 ${view === "opos" ? "bg-primary text-white" : "border border-default-200"}`}>
          {t("views.opos")}
        </Link>
      </nav>
      {view === "opos" ? <OpenItemsTable rows={openItems} canDun={canUpdate} /> : <InvoiceTable rows={rows} q={first(raw.q)} />}

      {canCreate && (newParam === "fatura" || newParam === "proforma" || newParam === "teklif") ? (
        <FormDrawer size="4xl" title={newParam === "proforma" ? t("newProforma") : newParam === "teklif" ? t("newQuote") : t("newInvoice")} description={t("form.draftHint")}>
          <InvoiceForm kind={newParam === "proforma" ? "PROFORMA" : newParam === "teklif" ? "QUOTE" : "INVOICE"} settings={settings} categoryOptions={categoryOptions} contacts={contacts} />
        </FormDrawer>
      ) : null}
      {canSettings && newParam === "ayarlar" ? (
        <FormDrawer title={t("settings.title")} description={t("settings.description")}>
          <InvoiceSettingsForm settings={settings} categoryOptions={categoryOptions} />
        </FormDrawer>
      ) : null}
      {canUpdate && editId ? (
        <FormDrawer size="4xl" title={t("form.editTitle")}>
          {editing && editing.status === "DRAFT" ? (
            <InvoiceForm invoice={editing} settings={settings} categoryOptions={categoryOptions} contacts={contacts} />
          ) : (
            <EmptyState title={t("errors.notDraft")} />
          )}
        </FormDrawer>
      ) : null}
    </div>
  );
}
