import { getTranslations } from "next-intl/server";

import { CourseProgressView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("progress.meta");
  return { title: t("course") };
}

export default async function CourseProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { courseId } = await params;
  return <CourseProgressView courseId={courseId} searchParams={searchParams} />;
}
