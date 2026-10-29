import { getTranslations } from "next-intl/server";
import { MeetingCreateView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("meetings.meta");
  return { title: t("create") };
}

/** Toplantı oluşturma (7.2) — ince rota. */
export default function YeniToplantiPage() {
  return <MeetingCreateView />;
}
