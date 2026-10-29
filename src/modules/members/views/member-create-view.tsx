import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { FormDrawer } from "@/shared/components/forms/form-drawer";
import { getTranslations } from "next-intl/server";

import { membersPermissions } from "../permissions";
import { listMemberTypeConfigs } from "../queries/list-member-types";
import { MemberForm } from "../components/member-form";

/**
 * Yeni üye formu (sağ çekmece; liste sayfasında `?yeni`). Üyelik numarası sunucuda üretilir.
 * Faz 3 eklemeleri: pasif üyelik türleri yeni kayıtta seçilemez (mevcut
 * üyelerin türü korunur — tür pasifleştirme yalnız yeni kaydı etkiler).
 */
export async function MemberCreateView() {
  try {
    await requirePermission(membersPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <FormDrawer title="">{<AccessDenied />}</FormDrawer>;
    throw error;
  }

  const [t, typeConfigs] = await Promise.all([
    getTranslations("members"),
    listMemberTypeConfigs(),
  ]);

  return (
    <FormDrawer title={t("createTitle")} description={t("createDescription")}>
      <MemberForm
        mode="create"
        availableTypes={typeConfigs.filter((row) => row.isActive).map((row) => row.type)}
      />
    </FormDrawer>
  );
}
