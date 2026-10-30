import { getTranslations } from "next-intl/server";

import { StudentDetailView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("students.meta");
  return { title: t("detail") };
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  return <StudentDetailView id={id} editOpen={raw.duzenle !== undefined} />;
}
