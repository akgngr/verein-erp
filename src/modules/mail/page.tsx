import { MailSettingsView } from "./views/mail-settings-view";

export const metadata = {
  title: "E-posta Ayarları — Verein ERP",
  description: "SMTP ayarları, bağlantı doğrulama ve test e-postası.",
};

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MailSettingsView searchParams={searchParams} />;
}
