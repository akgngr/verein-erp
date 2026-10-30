import { getTranslations } from "next-intl/server";

import { FeesView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("courses.meta");
  return { title: t("fees") };
}

export default function FeesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <FeesView searchParams={searchParams} />;
}
