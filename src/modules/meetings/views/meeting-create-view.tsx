import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { listCopySources } from "../queries/list-copy-sources";
import { meetingsPermissions } from "../permissions";
import { MEETING_TYPE_LABELS } from "../constants";
import { MeetingForm } from "../components/meeting-form";

/**
 * Toplantı oluşturma (7.2). KARAR: "Önceki toplantıdan kopyala" seçenekleri tür
 * bazında sunucudan ÖNDEN alınır (tip istemci değişiminde ayrı fetch yapmaz);
 * küçük veri kümesi (son 10) için basit ve güvenli yol budur.
 */
export async function MeetingCreateView() {
  try {
    await requirePermission(meetingsPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const types = Object.keys(MEETING_TYPE_LABELS) as Array<keyof typeof MEETING_TYPE_LABELS>;
  const sourceLists = await Promise.all(types.map((type) => listCopySources(type)));
  const copySourcesByType: Partial<
    Record<"BOARD" | "GENERAL_ASSEMBLY" | "COMMITTEE" | "OTHER", Awaited<ReturnType<typeof listCopySources>>>
  > = {};
  types.forEach((type, index) => {
    copySourcesByType[type] = sourceLists[index];
  });

  return (
    <div>
      <PageHeader
        title="Yeni toplantı"
        description="Toplantı kaydı oluşturun; numara otomatik üretilir (TOP-<yıl>-<sıra>)."
      />
      <MeetingForm mode="create" copySourcesByType={copySourcesByType} />
    </div>
  );
}
