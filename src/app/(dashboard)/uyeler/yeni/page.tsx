import { getTranslations } from "next-intl/server";
import { MemberCreateView } from "@/modules/members/ui";

export async function generateMetadata() {
  const t = await getTranslations("meta");
  return { title: t("uyeYeni") };
}

/** Yeni üye — ince rota. */
export default function YeniUyePage() {
  return <MemberCreateView />;
}
