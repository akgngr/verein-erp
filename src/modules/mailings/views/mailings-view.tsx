import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { MailingComposer, type ComposerSource } from "../components/mailing-composer";
import { mailingsPermissions } from "../permissions";
import { isMailConfigured, listCampaigns, listSources } from "../services/campaigns";

/** Toplu e-posta (?kaynak=<modül>:<kaynak>): yeni gönderim ve geçmiş. */
export async function MailingsView({ sourceId }: { sourceId?: string | null }) {
  let user;
  try {
    user = await requirePermission(mailingsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const [t, tRoot, format] = await Promise.all([getTranslations("mailings"), getTranslations(), getFormatter()]);
  const [configured, campaigns, rawSources] = await Promise.all([isMailConfigured(), listCampaigns(), listSources(user.role)]);
  const label = (key: string) => tRoot(key as never);
  const sources: ComposerSource[] = rawSources.map((source) => {
    const base = `${source.moduleKey}.recipients.${source.key}`;
    return {
      id: source.id,
      label: `${label(`${base}.label`)} (${label(`${source.moduleKey}.module.label`)})`,
      placeholders: source.placeholders,
      filters: source.filters.map((filter) => ({
        key: filter.key,
        label: label(`${base}.filters.${filter.key}.label`),
        defaults: filter.defaults,
        options: filter.options.map((value) => ({ value, label: label(`${base}.filters.${filter.key}.options.${value}`) })),
      })),
    };
  });
  const sourceLabel = (id: string) => {
    const [moduleKey, key] = id.split(":");
    return key === "api" ? label(`${moduleKey}.module.label`) : (sources.find((source) => source.id === id)?.label ?? id);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {!configured ? (
        <p className="rounded-medium bg-warning-50 p-3 text-small text-warning-700">
          {t("notConfigured")}{" "}
          <Link href="/mail" className="underline">
            {t("openSettings")}
          </Link>
        </p>
      ) : null}
      {can(user.role, mailingsPermissions, "create") ? <MailingComposer sources={sources} initialSourceId={sourceId ?? null} defaultBody={t("defaultBody")} /> : null}
      <section className="flex flex-col gap-2">
        <h2 className="text-medium font-semibold">{t("history")}</h2>
        {campaigns.length === 0 ? (
          <p className="text-small text-default-500">{t("noHistory")}</p>
        ) : (
          <div className="overflow-x-auto rounded-large border border-default-200 bg-content1">
            <table className="w-full text-small">
              <thead>
                <tr className="text-left text-tiny text-default-500">
                  <th className="px-3 py-2">{t("columns.date")}</th>
                  <th className="px-3 py-2">{t("columns.source")}</th>
                  <th className="px-3 py-2">{t("columns.subject")}</th>
                  <th className="px-3 py-2 text-right">{t("columns.result")}</th>
                  <th className="px-3 py-2">{t("columns.status")}</th>
                  <th className="px-3 py-2">{t("columns.by")}</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((row) => (
                  <tr key={row.id} className="border-t border-default-100">
                    <td className="whitespace-nowrap px-3 py-2">{format.dateTime(row.createdAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-3 py-2 text-default-600">{sourceLabel(row.source)}</td>
                    <td className="px-3 py-2">{row.subject}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {t("result", { sent: row.sentCount, total: row.recipientCount, failed: row.failedCount })}
                      <div className="text-tiny text-default-500">{t("skipped", { noEmail: row.skippedNoEmail, optOut: row.skippedOptOut })}</div>
                    </td>
                    <td className="px-3 py-2">{t(`statusLabels.${row.status}`)}</td>
                    <td className="px-3 py-2 text-default-500">{row.createdByLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
