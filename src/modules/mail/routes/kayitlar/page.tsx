import { MailLogsView } from "../../views/mail-logs-view";

export const metadata = {
  title: "E-posta Gönderim Kayıtları — Verein ERP",
  description: "Sistemden gönderilen e-postaların kayıtları.",
};

export default async function MailLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MailLogsView searchParams={searchParams} />;
}
