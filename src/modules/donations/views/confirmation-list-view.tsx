import { Download, FileDown } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";

import {
  CONFIRMATION_DEFAULT_SORT,
  CONFIRMATION_SORTABLE_FIELDS,
  listConfirmations,
} from "../queries/list-confirmations";
import { donationsPermissions } from "../permissions";
import { berlinTodayStart } from "../utils";
import { ConfirmationTable } from "../components/confirmation-table";

/** Bildirim listesi (§ 15 md. 5). */
export async function ConfirmationListView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let user;
  try {
    user = await requirePermission(donationsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const raw = await searchParams;
  const params = parseListParams(raw, {
    sortableFields: CONFIRMATION_SORTABLE_FIELDS,
    defaultSort: CONFIRMATION_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: ["year", "kind", "content", "status", "warned"],
  });
  const year =
    params.filters.year && /^\d{4}$/.test(params.filters.year)
      ? Number(params.filters.year)
      : berlinTodayStart().getUTCFullYear();
  const list = await listConfirmations({ ...params, filters: { ...params.filters, year: String(year) } });
  const t = await getTranslations("donations.confirmations");

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={String(year)}
        actions={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/bagislar/bildirimler/olustur" variant="flat">
              Bildirim oluştur
            </LinkButton>
            <LinkButton href="/api/donations/confirmations/export" variant="bordered" startIcon={<Download className="h-4 w-4" />}>
              {t("actions.export")}
            </LinkButton>
          </div>
        }
      />
      <ConfirmationTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        year={year}
        canDelete={can(user.role, donationsPermissions, "delete")}
      />
      <div className="mt-3 text-tiny text-default-400">
        <FileDown className="mr-1 inline h-3.5 w-3.5" aria-hidden />
        Toplu yazdırma: liste satırlarını seçip PDF düğmesini kullanın (§ 13, max 100).
      </div>
    </div>
  );
}
