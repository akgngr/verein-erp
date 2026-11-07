import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { CrmApp, type PartyRow } from "../components/crm-app";
import { crmPermissions } from "../permissions";
import { listDeals, listOpenFollowUps, listParties, pipelineStats } from "../services/crm";

/** /crm: kişiler, fırsat panosu ve takipler tek ekranda. */
export async function CrmView() {
  const t = await getTranslations("crm");
  let user;
  try {
    user = await requirePermission(crmPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const [parties, deals, followUps, stats] = await Promise.all([listParties({}), listDeals(), listOpenFollowUps(), pipelineStats()]);
  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <CrmApp
        parties={parties as PartyRow[]}
        deals={deals}
        followUps={followUps}
        stats={stats}
        can={{ create: can(user.role, crmPermissions, "create"), update: can(user.role, crmPermissions, "update"), delete: can(user.role, crmPermissions, "delete") }}
      />
    </div>
  );
}
