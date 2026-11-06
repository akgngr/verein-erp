import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { WorkflowCreateForm } from "../components/workflow-create-form";
import { automationPermissions } from "../permissions";
import { listWorkflows } from "../services/workflows";

export async function WorkflowsView() {
  let user;
  try {
    user = await requirePermission(automationPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const [t, format, workflows] = await Promise.all([
    getTranslations("automation.workflows"),
    getFormatter(),
    listWorkflows(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {can(user.role, automationPermissions, "create") ? <WorkflowCreateForm /> : null}
      {workflows.length === 0 ? (
        <p className="rounded-large border border-default-200 p-5 text-small text-default-500">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {workflows.map((workflow) => (
            <li key={workflow.id}>
              <Link href={`/automation/workflows/${workflow.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-large border border-default-200 bg-content1 p-4 hover:bg-default-50">
                <div className="min-w-0">
                  <p className="font-semibold">{workflow.name}</p>
                  <p className="text-small text-default-500">
                    {workflow.versions[0] ? t("version", { version: workflow.versions[0].version }) : t("draftOnly")}
                    {" · "}
                    {workflow.triggerEvent ?? t("manualTrigger")}
                    {" · "}
                    {format.dateTime(workflow.updatedAt, { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <span className={workflow.enabled ? "text-small font-medium text-success" : "text-small text-default-500"}>
                  {workflow.enabled ? t("active") : t("inactive")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
