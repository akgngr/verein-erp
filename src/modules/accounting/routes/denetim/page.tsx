import { getTranslations } from "next-intl/server";

import { AuditRoomView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("auditRoom") };
}

/** B001 Q1 — Kassenprüfer denetim odası. */
export default function MuhasebeDenetimOdasiPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string }>;
}) {
  return <AuditRoomView searchParams={searchParams} />;
}
