import { getTranslations } from "next-intl/server";

import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { YouthProtectionItemForm } from "../components/item-form";

/** Yeni kayıt çekmecesi (liste sayfasında `?yeni`). Yetki listede denetlenir. */
export async function YouthProtectionItemCreateView() {
  const t = await getTranslations("youth-protection.form");
  return (
    <FormDrawer title={t("createTitle")}>
      <YouthProtectionItemForm />
    </FormDrawer>
  );
}
