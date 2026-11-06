import { getTranslations } from "next-intl/server";

import { CalendarView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("calendar.meta");
  return { title: t("title") };
}

/** /calendar — ince rota; köprüyü `pnpm module:sync` üretir. */
export default function CalendarPage() {
  return <CalendarView />;
}
