import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { listCategoryOptions, listProjectOptions } from "@/modules/accounting/server";
import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawer } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { GrantDetailApp } from "../components/grant-detail";
import { GrantForm } from "../components/grant-form";
import { GrantsList } from "../components/grants-list";
import { grantsPermissions } from "../permissions";
import { buildReport, getGrant, listGrants } from "../services/grants";

const berlinToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

async function guard() {
  try {
    return await requirePermission(grantsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return null;
    throw error;
  }
}

/** /hibeler */
export async function GrantsListView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await guard();
  if (!user) return <AccessDenied />;
  const t = await getTranslations("grants");
  const [rows, projects] = await Promise.all([listGrants(), listProjectOptions()]);
  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <GrantsList rows={rows} canCreate={can(user.role, grantsPermissions, "create")} today={berlinToday()} />
      {can(user.role, grantsPermissions, "create") && (await searchParams).yeni !== undefined ? (
        <FormDrawer title={t("newGrant")} description={t("description")}>
          <GrantForm canEdit openAfterSave projects={projects} initial={{ id: null, name: "", funder: "", fileNumber: null, purpose: null, status: "PLANNED", approvedCents: null, ownShareCents: 0, thirdPartyCents: 0, periodStart: berlinToday(), periodEnd: berlinToday(), reportDueAt: null, projectId: null, useNetAmounts: false }} />
        </FormDrawer>
      ) : null}
    </div>
  );
}

/** /hibeler/<id> */
export async function GrantDetailView({ id }: { id: string }) {
  const user = await guard();
  if (!user) return <AccessDenied />;
  const t = await getTranslations("grants");
  const grant = await getGrant(id);
  if (!grant) notFound();
  const [report, projects, categories] = await Promise.all([buildReport(grant, t("otherLine")), listProjectOptions(), listCategoryOptions("EXPENSE")]);
  return (
    <div>
      <PageHeader title={grant.name} description={`${grant.funder}${grant.fileNumber ? ` · ${grant.fileNumber}` : ""}`} actions={<LinkButton href="/muhasebe/hibeler" variant="bordered">{t("title")}</LinkButton>} />
      <GrantDetailApp grant={grant} report={report} projects={projects} categories={categories.map((item) => ({ id: item.id, name: item.name }))} can={{ update: can(user.role, grantsPermissions, "update"), delete: can(user.role, grantsPermissions, "delete") }} today={berlinToday()} />
    </div>
  );
}
