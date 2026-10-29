import { getTranslations } from "next-intl/server";
import { AuditLogView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("audit.meta");
  return { title: t("list") };
}

export default async function DenetimKaydiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AuditLogView searchParams={searchParams} />;
}
