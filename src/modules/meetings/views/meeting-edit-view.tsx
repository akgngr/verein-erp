import { getTranslations } from "next-intl/server";
import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { notFound } from "next/navigation";

import { meetingsPermissions } from "../permissions";
import { getMeeting } from "../queries/get-meeting";
import { MeetingForm } from "../components/meeting-form";

/**
 * Toplantı düzenleme (7.2): yalnızca PLANNED/HELD durumunda açılır; onaylı ya
 * da iptal edilmiş toplantıda bilgi mesajı + geri bağlantı gösterilir (5. bölüm md. 4).
 */
export async function MeetingEditView({ id }: { id: string }) {
  const t = await getTranslations("meetings.form");
  try {
    await requirePermission(meetingsPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const meeting = await getMeeting(id);
  if (!meeting) notFound();

  const locked = meeting.status !== "PLANNED" && meeting.status !== "HELD";

  if (locked) {
    return (
      <div>
        <PageHeader title={t("editTitle")} />
        <div className="rounded-medium border border-warning-200 bg-warning-50 px-4 py-3 text-small text-warning-600">
          {meeting.status === "APPROVED"
            ? t("lockedApproved")
            : t("lockedCancelled")}
        </div>
        <a href={`/toplantilar/${meeting.id}`} className="mt-3 inline-block text-small text-primary">
          {t("backToDetail")}
        </a>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t("editTitle")} description={meeting.meetingNumber} />
      <MeetingForm
        mode="edit"
        meeting={{
          id: meeting.id,
          type: meeting.type,
          meetingNumber: meeting.meetingNumber,
          title: meeting.title,
          meetingDate: meeting.meetingDate,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          location: meeting.location,
          quorumRequired: meeting.quorumRequired,
          description: meeting.description,
          updatedAt: meeting.updatedAt,
        }}
      />
    </div>
  );
}
