import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { YouthProtectionItemTable } from "../components/item-table";
import { youthProtectionPermissions } from "../permissions";
import { ITEM_DEFAULT_SORT, ITEM_SORTABLE_FIELDS, listYouthProtectionItems } from "../queries/list-items";
import { FeeExemptionLetterView } from "./fee-exemption-letter-view";
import { YouthProtectionItemCreateView } from "./item-create-view";
import { YouthProtectionItemEditView } from "./item-edit-view";

/**
 * Sunucu view'ı: HeroUI içe AKTARMAZ (istemci gerektiren her şey components/ altında).
 * Form çekmecesi URL'den açılır:
 * - `?yeni` → oluşturma
 * - `?duzenle=<id>` → düzenleme
 * - `?letter` → harç muafiyet yazısı şablonu
 */
export async function YouthProtectionListView({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(youthProtectionPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("youth-protection");
  const raw = await searchParams;
  const params = parseListParams(raw, {
    sortableFields: ITEM_SORTABLE_FIELDS,
    defaultSort: ITEM_DEFAULT_SORT,
    defaultDir: "asc",
    filterKeys: ["status"],
  });
  const list = await listYouthProtectionItems(params);

  const canCreate = can(user.role, youthProtectionPermissions, "create");
  const canUpdate = can(user.role, youthProtectionPermissions, "update");
  const canDelete = can(user.role, youthProtectionPermissions, "delete");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="?letter=1"
              className="inline-flex items-center gap-1.5 rounded-medium border border-border px-3 py-1.5 text-sm font-medium hover:bg-default-100"
            >
              <FileText className="h-4 w-4" />
              {t("letter.openButton")}
            </Link>
            {canCreate ? (
              <FormDrawerButton param="yeni" startIcon={<Plus className="h-4 w-4" />}>
                {t("newItem")}
              </FormDrawerButton>
            ) : null}
          </div>
        }
      />
      <YouthProtectionItemTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
      {canCreate && raw.yeni !== undefined ? <YouthProtectionItemCreateView /> : null}
      {canUpdate && typeof raw.duzenle === "string" && raw.duzenle ? (
        <YouthProtectionItemEditView id={raw.duzenle} />
      ) : null}
      {raw.letter !== undefined ? (
        <FeeExemptionLetterView
          initialPersonName={typeof raw.letter === "string" && raw.letter !== "1" ? raw.letter : undefined}
        />
      ) : null}
    </div>
  );
}
