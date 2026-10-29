import { AuditLogView } from "./ui";

export const metadata = { title: "Denetim Kaydı" };

export default async function DenetimKaydiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AuditLogView searchParams={searchParams} />;
}
