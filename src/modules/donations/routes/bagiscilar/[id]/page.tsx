import { getTranslations } from "next-intl/server";
import { DonorDetailView } from "../../../ui";

export async function generateMetadata() {
  const t = await getTranslations("donations.meta");
  return { title: t("donorDetail") };
}

/** Bağışçı detayı — ince rota: id'yi view'a iletir. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DonorDetailView id={id} />;
}
