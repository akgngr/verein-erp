import { FilePlus2, FileText, Settings2 } from "lucide-react";
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

  const [rows, settings, categories, editing] = await Promise.all([
    listInvoices({ kind: first(raw.kind), status: first(raw.status), q: first(raw.q) }),
    getInvoiceSettings(),
    needsForm ? listCategoryOptions("INCOME") : [],
    editId ? getInvoice(editId) : null,
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
      <InvoiceTable rows={rows} q={first(raw.q)} />

      {canCreate && (newParam === "fatura" || newParam === "proforma") ? (
        <FormDrawer title={newParam === "proforma" ? t("newProforma") : t("newInvoice")} description={t("form.draftHint")}>
          <InvoiceForm kind={newParam === "proforma" ? "PROFORMA" : "INVOICE"} settings={settings} categoryOptions={categoryOptions} />
        </FormDrawer>
      ) : null}
      {canSettings && newParam === "ayarlar" ? (
        <FormDrawer title={t("settings.title")} description={t("settings.description")}>
          <InvoiceSettingsForm settings={settings} categoryOptions={categoryOptions} />
        </FormDrawer>
      ) : null}
      {canUpdate && editId ? (
        <FormDrawer title={t("form.editTitle")}>
          {editing && editing.status === "DRAFT" ? (
            <InvoiceForm invoice={editing} settings={settings} categoryOptions={categoryOptions} />
          ) : (
            <EmptyState title={t("errors.notDraft")} />
          )}
        </FormDrawer>
      ) : null}
    </div>
  );
}
