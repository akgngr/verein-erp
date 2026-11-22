import { getTranslations } from "next-intl/server";

import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { FeeExemptionLetterDrawerContent } from "../components/fee-exemption-letter-drawer-content";

export async function FeeExemptionLetterView({ initialPersonName }: { initialPersonName?: string }) {
  const t = await getTranslations("youth-protection.letter");
  return (
    <FormDrawer title={t("title")}>
      <FeeExemptionLetterDrawerContent initialPersonName={initialPersonName} />
    </FormDrawer>
  );
}
