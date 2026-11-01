import { getFormatter, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { InboxPanel } from "../components/inbox-panel";
import { InboxSettingsForm } from "../components/inbox-settings-form";
import { mailInboxPermissions } from "../permissions";
import { getInboxSettings, isAccountingUsable, listInboxMessages } from "../services/inbox";

/** E-posta → Gelen kutusu (?durum=NEW|DONE|ALL). */
export async function InboxView({ status }: { status?: string | null }) {
  let user;
  try {
    user = await requirePermission(mailInboxPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const [t, format] = await Promise.all([getTranslations("mail.inbox"), getFormatter()]);
  const filter = status === "DONE" || status === "ALL" ? status : "NEW";
  const [settings, rows, accountingUsable] = await Promise.all([getInboxSettings(), listInboxMessages(filter === "ALL" ? null : filter), isAccountingUsable()]);
  const imapConfigured = Boolean(settings.host && settings.username && settings.hasPassword);
  const canSettings = can(user.role, mailInboxPermissions, "update");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {settings.lastFetchAt ? (
        <p className="text-tiny text-default-500">
          {t("lastFetch", { date: format.dateTime(settings.lastFetchAt, { dateStyle: "medium", timeStyle: "short" }) })}
          {settings.lastError ? <span className="text-danger"> · {t(`errors.${settings.lastError}` as never)}</span> : null}
        </p>
      ) : null}
      <InboxPanel
        filter={filter}
        imapConfigured={imapConfigured}
        accountingUsable={accountingUsable}
        canManage={can(user.role, mailInboxPermissions, "create")}
        canDelete={can(user.role, mailInboxPermissions, "delete")}
        rows={rows.map((row) => ({
          id: row.id,
          source: row.source,
          fromAddress: row.fromAddress,
          fromName: row.fromName,
          subject: row.subject,
          receivedAt: row.receivedAt.toISOString(),
          snippet: row.snippet,
          status: row.status === "DONE" ? "DONE" : "NEW",
          attachments: row.attachments.map((attachment) => ({ id: attachment.id, fileName: attachment.fileName, size: attachment.size, importedTo: attachment.importedTo })),
        }))}
      />
      <p className="text-tiny text-default-500">{t("privacy")}</p>
      {canSettings ? (
        <section className="space-y-3 rounded-large border border-default-200 bg-content1 p-4">
          <h2 className="text-medium font-semibold">{t("settings.title")}</h2>
          <InboxSettingsForm initial={settings} />
        </section>
      ) : null}
    </div>
  );
}
