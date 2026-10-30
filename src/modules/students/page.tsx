import { getTranslations } from "next-intl/server";

import { StudentListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("students.meta");
  return { title: t("list") };
}

export default function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <StudentListView searchParams={searchParams} />;
}
