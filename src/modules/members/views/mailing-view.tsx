import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { MailingComposer } from "../components/mailing-composer";
import { memberMailingsPermissions } from "../permissions";
import { isMailConfigured, listMailings } from "../services/bulk-mail";

/** Üyeler → Toplu e-posta: yeni duyuru ve gönderim geçmişi. */
export async function MailingView() {
  let user;
  try {
    user = await requirePermission(memberMailingsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const [t, format] = await Promise.all([getTranslations("members"), getFormatter()]);
  const [configured, mailings] = await Promise.all([isMailConfigured(), listMailings()]);
  const canSend = can(user.role, memberMailingsPermissions, "create");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("mailing.title")} description={t("mailing.description")} />
      {!configured ? (
        <p className="rounded-medium bg-warning-50 p-3 text-small text-warning-700">
          {t("mailing.notConfigured")}{" "}
          <Link href="/mail" className="underline">
            {t("mailing.openSettings")}
          </Link>
        </p>
      ) : null}
      {canSend ? <MailingComposer defaultBody={t("mailing.defaultBody")} /> : null}
      <section className="flex flex-col gap-2">
        <h2 className="text-medium font-semibold">{t("mailing.history")}</h2>
        {mailings.length === 0 ? (
          <p className="text-small text-default-500">{t("mailing.noHistory")}</p>
        ) : (
          <div className="overflow-x-auto rounded-large border border-default-200 bg-content1">
            <table className="w-full text-small">
              <thead>
                <tr className="text-left text-tiny text-default-500">
                  <th className="px-3 py-2">{t("mailing.columns.date")}</th>
                  <th className="px-3 py-2">{t("mailing.columns.subject")}</th>
                  <th className="px-3 py-2 text-right">{t("mailing.columns.result")}</th>
                  <th className="px-3 py-2">{t("mailing.columns.status")}</th>
                  <th className="px-3 py-2">{t("mailing.columns.by")}</th>
                </tr>
              </thead>
              <tbody>
                {mailings.map((row) => (
                  <tr key={row.id} className="border-t border-default-100">
                    <td className="px-3 py-2 whitespace-nowrap">{format.dateTime(row.createdAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-3 py-2">{row.subject}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {t("mailing.result", { sent: row.sentCount, total: row.recipientCount, failed: row.failedCount })}
                      <div className="text-tiny text-default-500">{t("mailing.skipped", { noEmail: row.skippedNoEmail, optOut: row.skippedOptOut })}</div>
                    </td>
                    <td className="px-3 py-2">{t(`mailing.statusLabels.${row.status}`)}</td>
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
