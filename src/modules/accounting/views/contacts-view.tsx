import { UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawer, FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import type { RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { ContactForm } from "../components/contact-form";
import { ContactTable } from "../components/contact-table";
import { accountingPermissions } from "../permissions";
import { getContact, listContacts } from "../queries/contacts";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** ACC-3 cari kartlar (Debitoren/Kreditoren): liste + yeni/düzenle çekmecesi. */
export async function ContactsView({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(accountingPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const raw = await searchParams;
  const t = await getTranslations("accounting.contacts");
  const canCreate = can(user.role, accountingPermissions, "create");
  const canUpdate = can(user.role, accountingPermissions, "update");
  const newParam = first(raw.yeni);
  const editId = first(raw.duzenle);
  const [rows, editing] = await Promise.all([listContacts({ type: first(raw.type), q: first(raw.q) }), editId ? getContact(editId) : null]);

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canCreate ? (
            <div className="flex gap-2">
              <FormDrawerButton param="yeni" value="musteri" startIcon={<UserPlus className="h-4 w-4" />}>
                {t("newCustomer")}
              </FormDrawerButton>
              <FormDrawerButton param="yeni" value="tedarikci" variant="bordered" color="default" startIcon={<UserPlus className="h-4 w-4" />}>
                {t("newSupplier")}
              </FormDrawerButton>
            </div>
          ) : null
        }
      />
      <ContactTable rows={rows} q={first(raw.q)} canUpdate={canUpdate} />
      {canCreate && (newParam === "musteri" || newParam === "tedarikci") ? (
        <FormDrawer title={newParam === "tedarikci" ? t("newSupplier") : t("newCustomer")}>
          <ContactForm defaultType={newParam === "tedarikci" ? "SUPPLIER" : "CUSTOMER"} />
        </FormDrawer>
      ) : null}
      {canUpdate && editing ? (
        <FormDrawer title={t("edit")} description={`${editing.number} · ${editing.name}`}>
          <ContactForm contact={editing} />
        </FormDrawer>
      ) : null}
    </div>
  );
}
