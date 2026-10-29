import { getTranslations } from "next-intl/server";
import { MailLogsView } from "../../views/mail-logs-view";

export async function generateMetadata() {
  const t = await getTranslations("mail.meta");
  return { title: t("logs") };
}

export default async function MailLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MailLogsView searchParams={searchParams} />;
}
