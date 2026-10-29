import { getTranslations } from "next-intl/server";
import { ImportView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("members.meta");
  return { title: t("import") };
}

export default function IceAktarPage() {
  return <ImportView />;
}
