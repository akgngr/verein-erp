import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { PageHeader } from "@/shared/components/ui/page-header";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { MAIL_BASE_PATH, MAIL_SECURITY_LABEL_KEYS, MAIL_TRANSPORT_LABEL_KEYS } from "../constants";
import { formatDateTime, isTestModalRequested } from "../helpers/mail-helpers";
import { getMailSettings } from "../queries/get-mail-settings";
import { getMailAbilities } from "../services/mail-abilities";
import { MailSettingsForm } from "../components/mail-settings-form";
import { MailTestModal } from "../components/mail-test-modal";
import type { MailSearchParams } from "../types";

interface MailSettingsViewProps {
  searchParams: Promise<MailSearchParams>;
}

export async function MailSettingsView({ searchParams }: MailSettingsViewProps) {
  const params = await searchParams;
  const abilities = await getMailAbilities();

  if (!abilities.canView) {
    return <AccessDenied />;
  }

  const [t, locale, settings] = await Promise.all([
    getTranslations("mail"),
    getLocale(),
    getMailSettings(),
  ]);

  const isTestOpen = abilities.canSendTest && isTestModalRequested(params);
  const serverLabel = settings.host ? `${settings.host}:${settings.port}` : "—";
  const senderLabel = settings.fromAddress
    ? settings.fromName
      ? `${settings.fromName} <${settings.fromAddress}>`
      : settings.fromAddress
    : "—";

  const statusRows = [
    {
      key: "transport",
      label: t("fields.transport"),
      value: t(MAIL_TRANSPORT_LABEL_KEYS[settings.transport]),
    },
    { key: "server", label: t("status.server"), value: serverLabel },
    {
      key: "security",
      label: t("fields.security"),
      value: t(MAIL_SECURITY_LABEL_KEYS[settings.security]),
    },
    { key: "sender", label: t("status.sender"), value: senderLabel },
    {
      key: "updatedAt",
      label: t("status.updatedAt"),
      value: formatDateTime(settings.updatedAt, locale),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          abilities.canSendTest ? (
            <Link
              href={`${MAIL_BASE_PATH}?action=test`}
              scroll={false}
              className="inline-flex h-10 items-center gap-2 rounded-medium bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {t("actions.sendTest")}
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section
          aria-label={t("status.title")}
          className="flex flex-col gap-4 rounded-large border border-default-200 bg-content1 p-5 shadow-small lg:col-span-1"
        >
          <div className="flex items-center gap-2">
            {settings.isConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
            )}
            <h2 className="text-medium font-semibold text-foreground">
              {settings.isConfigured ? t("status.configured") : t("status.notConfigured")}
            </h2>
          </div>
          <p className="text-small text-default-500">
            {settings.isConfigured ? t("status.configuredHint") : t("status.notConfiguredHint")}
          </p>
          <dl className="flex flex-col gap-2 text-small">
            {statusRows.map((row) => (
              <div key={row.key} className="flex flex-col">
                <dt className="text-tiny uppercase tracking-wider text-default-400">{row.label}</dt>
                <dd className="break-all text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="lg:col-span-2">
          <MailSettingsForm settings={settings} canUpdate={abilities.canUpdate} />
        </div>
      </div>

      {abilities.canSendTest ? <MailTestModal isOpen={isTestOpen} /> : null}
    </div>
  );
}
