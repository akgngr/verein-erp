import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { CrmApp, type PartyRow } from "../components/crm-app";
import { crmPermissions } from "../permissions";
import { listDeals, listOpenFollowUps, listParties, pipelineStats } from "../services/crm";

/** /crm: kişiler, fırsat panosu ve takipler tek ekranda. `?kayit=<id>` (ör. Görev Merkezi'nden) kişi panelini açar. */
export async function CrmView({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const t = await getTranslations("crm");
  let user;
  try {
    user = await requirePermission(crmPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  // #582: Kişi adı/iletişimi yalnız kaynak modülü görebilen rollere çözülür.
  const viewer = { role: user.role, restrictedLabel: t("restricted") };
  const [parties, deals, followUps, stats] = await Promise.all([listParties({}, viewer), listDeals(viewer), listOpenFollowUps(viewer), pipelineStats()]);
  const requested = (await searchParams)?.kayit;
  const openParam = typeof requested === "string" ? requested : null;
  // Only a party this list already shows can be opened; anything else is ignored.
  const initialOpenId = openParam && parties.some((party) => party.id === openParam) ? openParam : null;
  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <CrmApp
        parties={parties as PartyRow[]}
        deals={deals}
        followUps={followUps}
        stats={stats}
        initialOpenId={initialOpenId}
        can={{ create: can(user.role, crmPermissions, "create"), update: can(user.role, crmPermissions, "update"), delete: can(user.role, crmPermissions, "delete") }}
      />
    </div>
  );
}
