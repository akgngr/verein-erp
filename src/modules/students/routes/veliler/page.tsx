import { getTranslations } from "next-intl/server";

import { GuardianListView } from "../../ui";

export async function generateMetadata() {
  const t = await getTranslations("students.meta");
  return { title: t("guardians") };
}

export default function GuardiansPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <GuardianListView searchParams={searchParams} />;
}
