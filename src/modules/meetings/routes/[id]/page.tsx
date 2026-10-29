import { getTranslations } from "next-intl/server";
import { MeetingDetailView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("meetings.meta");
  return { title: t("detail") };
}

/**
 * Toplantı detayı (7.3) — ince rota: ?sekme= sekme, ?gundem= karar önden
 * seçimi (7.3 Gündem "Karar ekle" bağlantısı).
 */
export default async function ToplantiDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const tab = Array.isArray(raw.sekme) ? raw.sekme[0] : raw.sekme;
  const gundem = Array.isArray(raw.gundem) ? raw.gundem[0] : raw.gundem;
  return <MeetingDetailView id={id} tabParam={tab} agendaPreset={gundem} />;
}
