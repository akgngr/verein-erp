import { getTranslations } from "next-intl/server";
import { DonationCreateView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("donations.meta");
  return { title: t("create") };
}

/** Yeni bağış — ince rota. */
export default function Page() {
  return <DonationCreateView />;
}
