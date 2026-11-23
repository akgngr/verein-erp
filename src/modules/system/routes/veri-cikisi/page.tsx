import { getTranslations } from "next-intl/server";
import { EgressReportView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("system.egressUi");
  return { title: t("title") };
}

export default function DataEgressPage() {
  return <EgressReportView />;
}
