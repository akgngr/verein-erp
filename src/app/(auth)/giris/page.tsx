import { getTranslations } from "next-intl/server";

import type { RawSearchParams } from "@/shared/list-params";

import { LoginView } from "@/modules/auth/ui";

import { LoginLocaleSwitcher } from "./locale-switcher";

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
  return (
    <>
      <div className="fixed right-4 top-4 z-10">
        <LoginLocaleSwitcher />
      </div>
      <LoginView passive={params.pasif === "1"} oauthDenied={params.oauth === "denied"} />
    </>
  );
}
