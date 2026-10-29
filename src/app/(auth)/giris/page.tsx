import { getTranslations } from "next-intl/server";

import type { RawSearchParams } from "@/shared/list-params";

import { LoginView } from "@/modules/auth/ui";

export async function generateMetadata() {
  const t = await getTranslations("common");
  return { title: t("loginTitle") };
}

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  return <LoginView passive={params.pasif === "1"} />;
}
