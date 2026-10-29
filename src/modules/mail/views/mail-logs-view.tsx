import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/shared/components/ui/page-header";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { parseMailLogFilters } from "../helpers/mail-helpers";
import { listMailLogModules, listMailLogs } from "../queries/list-mail-logs";
import { getMailAbilities } from "../services/mail-abilities";
import { MailLogTable } from "../components/mail-log-table";
import type { MailSearchParams } from "../types";

interface MailLogsViewProps {
  searchParams: Promise<MailSearchParams>;
}

export async function MailLogsView({ searchParams }: MailLogsViewProps) {
  const params = await searchParams;
  const abilities = await getMailAbilities();

  if (!abilities.canView) {
    return <AccessDenied />;
  }

  const filters = parseMailLogFilters(params);
  const [t, locale, result, modules] = await Promise.all([
    getTranslations("mail"),
    getLocale(),
    listMailLogs(filters),
    listMailLogModules(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("logs.title")} description={t("logs.description")} />
      <MailLogTable result={result} filters={filters} modules={modules} locale={locale} />
    </div>
  );
}
