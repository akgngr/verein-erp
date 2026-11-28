import { getTranslations } from "next-intl/server";

import { FormDrawer } from "@/shared/components/forms/form-drawer";
import { EmptyState } from "@/shared/components/ui/empty-state";

import { SponsorForm } from "../components/sponsor-form";
import { getSponsor } from "../queries/list-sponsors";

/** Düzenleme çekmecesi (liste sayfasında `?duzenle=<id>`). */
export async function SponsorEditView({ id }: { id: string }) {
  const t = await getTranslations("sponsors");
  const sponsor = await getSponsor(id);
  return (
    <FormDrawer title={t("form.editTitle")} description={sponsor?.name}>
      {sponsor ? <SponsorForm sponsor={sponsor} /> : <EmptyState title={t("errors.notFound")} />}
    </FormDrawer>
  );
}
