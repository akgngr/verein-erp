import { getTranslations } from "next-intl/server";
import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { listCopySources } from "../queries/list-copy-sources";
import { meetingsPermissions } from "../permissions";
import { MEETING_TYPE_VALUES } from "../constants";
import { MeetingForm } from "../components/meeting-form";

/**
 * Toplantı oluşturma (7.2). KARAR: "Önceki toplantıdan kopyala" seçenekleri tür
 * bazında sunucudan ÖNDEN alınır (tip istemci değişiminde ayrı fetch yapmaz);
 * küçük veri kümesi (son 10) için basit ve güvenli yol budur.
 */
export async function MeetingCreateView() {
  const t = await getTranslations("meetings.form");
  try {
    await requirePermission(meetingsPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <FormDrawer title="">{<AccessDenied />}</FormDrawer>;
    throw error;
  }

  const types = MEETING_TYPE_VALUES;
  const sourceLists = await Promise.all(types.map((type) => listCopySources(type)));
  const copySourcesByType: Partial<
    Record<"BOARD" | "GENERAL_ASSEMBLY" | "COMMITTEE" | "OTHER", Awaited<ReturnType<typeof listCopySources>>>
  > = {};
  types.forEach((type, index) => {
    copySourcesByType[type] = sourceLists[index];
  });

  return (
    <FormDrawer title={t("createTitle")} description={t("createPageDescription")}>
      <MeetingForm mode="create" copySourcesByType={copySourcesByType} />
    </FormDrawer>
  );
}
