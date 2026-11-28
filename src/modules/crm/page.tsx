import { getTranslations } from "next-intl/server";

import { CrmView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("crm.meta");
  return { title: t("list") };
}

/** Modül ana sayfası (/crm) — ince rota; köprüyü `pnpm module:sync` üretir. `?kayit=<id>` kişiyi açar. */
export default function CrmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CrmView searchParams={searchParams} />;
}
