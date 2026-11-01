import { getTranslations } from "next-intl/server";

import type { RawSearchParams } from "@/shared/list-params";

import { ContactsView } from "../../server";

export async function generateMetadata() {
  const t = await getTranslations("accounting.meta");
  return { title: t("contacts") };
}

/** Cari kartlar (Debitoren/Kreditoren) — ACC-3. */
export default function MuhasebeCarilerPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <ContactsView searchParams={searchParams} />;
}
