import { getTranslations } from "next-intl/server";
import { DonationEditView } from "../../../ui";

export async function generateMetadata() {
  const t = await getTranslations("donations.meta");
  return { title: t("edit") };
}

/** Bağış düzenleme — ince rota: id'yi view'a iletir. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DonationEditView id={id} />;
}
