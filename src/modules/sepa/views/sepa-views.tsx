import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { SepaApp, SepaRunDetail } from "../components/sepa-app";
import { earliestCollectionDate } from "../lib/pain008";
import { sepaPermissions } from "../permissions";
import { creditorProblems, getRun, listRuns } from "../services/runs";

async function guard() {
  try {
    return await requirePermission(sepaPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return null;
    throw error;
  }
}

/** /sepa */
export async function SepaView() {
  const user = await guard();
  if (!user) return <AccessDenied />;
  const t = await getTranslations("sepa");
  const usable = new Set(await listUsableModuleKeys());
  const sources = [...(usable.has("members") ? (["MEMBER_DUES"] as const) : []), ...(usable.has("courses") && usable.has("students") ? (["COURSE_FEES"] as const) : [])];
  const now = new Date();
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const [runs, problems] = await Promise.all([listRuns(), creditorProblems()]);
  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <SepaApp runs={runs} sources={sources} problems={problems} canCreate={can(user.role, sepaPermissions, "create")} defaults={{ year: String(now.getUTCFullYear()), until: monthEnd, collectionDate: earliestCollectionDate(now, 2) }} />
    </div>
  );
}

/** /sepa/<id> */
export async function SepaRunView({ id }: { id: string }) {
  const user = await guard();
  if (!user) return <AccessDenied />;
  const t = await getTranslations("sepa");
  const run = await getRun(id);
  if (!run) notFound();
  return (
    <div>
      <PageHeader title={run.number} description={`${t(`sources.${run.source}`)} · ${run.sourceParam} · ${run.createdByLabel}`} actions={<LinkButton href="/muhasebe/sepa" variant="bordered">{t("title")}</LinkButton>} />
      <SepaRunDetail run={run} can={{ download: can(user.role, sepaPermissions, "create"), update: can(user.role, sepaPermissions, "update"), cancel: can(user.role, sepaPermissions, "delete") }} />
    </div>
  );
}
