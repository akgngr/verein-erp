import { getTranslations } from "next-intl/server";

import { CoursePickerView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("progress.meta");
  return { title: t("list") };
}

export default function ProgressPage() {
  return <CoursePickerView />;
}
