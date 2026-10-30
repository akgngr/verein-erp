import { getTranslations } from "next-intl/server";

import { CourseListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("courses.meta");
  return { title: t("list") };
}

export default function CoursesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CourseListView searchParams={searchParams} />;
}
