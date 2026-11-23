import { getTranslations } from "next-intl/server";

import { requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { AuditRoomPanel } from "../components/audit-room-panel";
import { accountingPermissions } from "../permissions";
import { getAuditRoomOverview } from "../services/audit-room";

export async function AuditRoomView({ searchParams }: { searchParams?: Promise<{ year?: string }> }) {
  const user = await requirePermission(accountingPermissions, "view");
  const t = await getTranslations("accounting.auditRoom");
  const params = (await searchParams) ?? {};
  const parsedYear = params.year && /^\d{4}$/.test(params.year) ? Number(params.year) : new Date().getUTCFullYear();
  const overview = await getAuditRoomOverview({ id: user.id, role: user.role }, parsedYear);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {overview.expiredOrMissing ? (
        <div className="space-y-2">
          <p className="text-sm text-ink-600">{t("expiredMessage")}</p>
          <AccessDenied />
        </div>
      ) : (
        <AuditRoomPanel overview={overview} />
      )}
    </div>
  );
}
