import { getTranslations } from "next-intl/server";

import { FilesView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("exports");
  return { title: t("title") };
}

export default function FilesPage() {
  return <FilesView />;
}
