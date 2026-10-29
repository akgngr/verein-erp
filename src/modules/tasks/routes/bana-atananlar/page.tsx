import { getTranslations } from "next-intl/server";

import { TasksListView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("tasks.meta");
  return { title: t("assignedToMe") };
}

/** Bana atananlar alt sayfası (/tasks/bana-atananlar) — ince rota. */
export default function AssignedTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TasksListView searchParams={searchParams} assignedToMe={true} />;
}
