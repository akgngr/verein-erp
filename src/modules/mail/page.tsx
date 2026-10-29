import { getTranslations } from "next-intl/server";
import { MailSettingsView } from "./views/mail-settings-view";

export async function generateMetadata() {
  const t = await getTranslations("mail.meta");
  return { title: t("settings") };
}

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MailSettingsView searchParams={searchParams} />;
}
