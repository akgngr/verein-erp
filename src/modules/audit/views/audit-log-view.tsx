import { getTranslations } from "next-intl/server";

import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import type { RawSearchParams } from "@/shared/list-params";
import { parseListParams } from "@/shared/list-params";

import { AuditLogTable } from "../components/audit-log-table";
import { listAuditLogs } from "../queries/list-audit-logs";
import { auditPermissions } from "../permissions";

export async function AuditLogView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  try {
    await requirePermission(auditPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("audit");
  const params = parseListParams(await searchParams, {
    sortableFields: ["createdAt"],
    defaultSort: "createdAt",
    defaultDir: "desc",
    filterKeys: ["action", "entity"],
  });

  const { rows, total } = await listAuditLogs(params);

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
      />
      <AuditLogTable
        rows={rows}
        total={total}
        page={params.page}
        pageSize={params.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
      />
    </div>
  );
}
