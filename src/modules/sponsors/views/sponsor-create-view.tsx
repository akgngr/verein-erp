import { getTranslations } from "next-intl/server";

import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { SponsorForm } from "../components/sponsor-form";

/** Yeni sponsor çekmecesi (liste sayfasında `?yeni`). Yetki listede denetlenir. */
export async function SponsorCreateView() {
  const t = await getTranslations("sponsors.form");
  return (
    <FormDrawer title={t("createTitle")}>
      <SponsorForm />
    </FormDrawer>
  );
}
