import { getTranslations } from "next-intl/server";
import { ConfirmationDetailView } from "../../../ui";

export async function generateMetadata() {
  const t = await getTranslations("donations.meta");
  return { title: t("confirmationDetail") };
}

/** Bildirim detayı — ince rota. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConfirmationDetailView id={id} />;
}
