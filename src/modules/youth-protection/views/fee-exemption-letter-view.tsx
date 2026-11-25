import { getTranslations } from "next-intl/server";

import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { FeeExemptionLetterDrawerContent } from "../components/fee-exemption-letter-drawer-content";
import type { FeeExemptionLetterOrganization } from "../services/fee-exemption-letter";

export async function FeeExemptionLetterView({ initialPersonName, organization }: { initialPersonName?: string; organization?: FeeExemptionLetterOrganization }) {
  const t = await getTranslations("youth-protection.letter");
  return (
    <FormDrawer title={t("title")}>
      <FeeExemptionLetterDrawerContent initialPersonName={initialPersonName} organization={organization} />
    </FormDrawer>
  );
}
