import { getTranslations } from "next-intl/server";

import { CourseDetailView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("courses.meta");
  return { title: t("detail") };
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return <CourseDetailView id={id} searchParams={searchParams} />;
}
