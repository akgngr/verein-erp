import { getTranslations } from "next-intl/server";
import { MemberTypeListView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("members.meta");
  return { title: t("types") };
}

export default function TurlerPage() {
  return <MemberTypeListView />;
}
