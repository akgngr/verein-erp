import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/shared/components/ui/empty-state";
import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { YouthProtectionItemForm } from "../components/item-form";
import { getYouthProtectionItem } from "../queries/list-items";

/** Düzenleme çekmecesi (liste sayfasında `?duzenle=<id>`). */
export async function YouthProtectionItemEditView({ id }: { id: string }) {
  const t = await getTranslations("youth-protection");
  const item = await getYouthProtectionItem(id);
  return (
    <FormDrawer title={t("form.editTitle")} description={item?.personName}>
      {item ? <YouthProtectionItemForm item={item} /> : <EmptyState title={t("errors.notFound")} />}
    </FormDrawer>
  );
}
