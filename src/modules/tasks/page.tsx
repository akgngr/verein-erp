import { getTranslations } from "next-intl/server";

import { TasksListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("tasks.meta");
  return { title: t("list") };
}

/** Modül ana sayfası (/tasks) — ince rota; köprüyü `pnpm module:sync` üretir. */
export default function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TasksListView searchParams={searchParams} />;
}
