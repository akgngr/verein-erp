import { getTranslations } from "next-intl/server";
import { DonorCreateView } from "../../../ui";

export async function generateMetadata() {
  const t = await getTranslations("donations.meta");
  return { title: t("donorCreate") };
}

/** Yeni bağışçı — ince rota. */
export default function Page() {
  return <DonorCreateView />;
}
