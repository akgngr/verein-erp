import { getTranslations } from "next-intl/server";

import { SubscribersView } from "../../views/subscribers-view";

export async function generateMetadata() {
  const t = await getTranslations("notifications.ui.subscribers");
  return { title: t("title") };
}

export default function SubscribersPage() {
  return <SubscribersView />;
}
