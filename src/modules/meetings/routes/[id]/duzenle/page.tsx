import { getTranslations } from "next-intl/server";
import { MeetingEditView } from "../../../ui";

export async function generateMetadata() {
  const t = await getTranslations("meetings.meta");
  return { title: t("edit") };
}

/** Toplantı düzenleme (7.2) — ince rota. */
export default async function ToplantiDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingEditView id={id} />;
}
