import { getTranslations } from "next-intl/server";

import { TeachersView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("courses.meta");
  return { title: t("teachers") };
}

export default function TeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <TeachersView searchParams={searchParams} />;
}
