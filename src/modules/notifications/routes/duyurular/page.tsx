import { getTranslations } from "next-intl/server";

import { AnnouncementView } from "../../views/announcement-view";

export async function generateMetadata() {
  const t = await getTranslations("notifications.ui.announcement");
  return { title: t("title") };
}

export default function AnnouncementsPage() {
  return <AnnouncementView />;
}
