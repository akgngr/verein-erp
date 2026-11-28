import { Coins, Handshake, Plus, Sparkles, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { StatCard } from "@/shared/components/ui/stat-card";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { formatMoney } from "@/shared/money";
import { can } from "@/shared/permissions/define";

import { SponsorTable } from "../components/sponsor-table";
import { sponsorsPermissions } from "../permissions";
import {
  getSponsorSummary,
  listSponsors,
  SPONSOR_DEFAULT_SORT,
  SPONSOR_SORTABLE_FIELDS,
} from "../queries/list-sponsors";
import { SponsorCreateView } from "./sponsor-create-view";
import { SponsorEditView } from "./sponsor-edit-view";

/**
 * Sunucu view'ı: UI framework primitive'lerini doğrudan içe aktarmaz;
 * form çekmecesi URL üzerinden (`?yeni` / `?duzenle=<id>`) yönetilir.
 */
export async function SponsorsListView({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(sponsorsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const [t, locale, raw] = await Promise.all([
    getTranslations("sponsors"),
    getLocale(),
    searchParams,
  ]);
  const moneyLocale = locale === "de" ? "de-DE" : "tr-TR";

  const params = parseListParams(raw, {
    sortableFields: SPONSOR_SORTABLE_FIELDS,
    defaultSort: SPONSOR_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: ["status", "tier"],
  });

  const [list, summary] = await Promise.all([listSponsors(params), getSponsorSummary()]);

  const canCreate = can(user.role, sponsorsPermissions, "create");
  const canUpdate = can(user.role, sponsorsPermissions, "update");
  const canDelete = can(user.role, sponsorsPermissions, "delete");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canCreate ? (
            <FormDrawerButton param="yeni" startIcon={<Plus className="h-4 w-4" />}>
              {t("newSponsor")}
            </FormDrawerButton>
          ) : null
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("summary.total")}
          value={summary.totalCount}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label={t("summary.active")}
          value={summary.activeCount}
          icon={<Handshake className="h-4 w-4" />}
        />
        <StatCard
          label={t("summary.activeAmount")}
          value={formatMoney(summary.activeAmountCents, moneyLocale)}
          icon={<Coins className="h-4 w-4" />}
        />
        <StatCard
          label={t("summary.leads")}
          value={summary.leadCount}
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>
      <SponsorTable
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
      {canCreate && raw.yeni !== undefined ? <SponsorCreateView /> : null}
      {canUpdate && typeof raw.duzenle === "string" && raw.duzenle ? <SponsorEditView id={raw.duzenle} /> : null}
    </div>
  );
}
