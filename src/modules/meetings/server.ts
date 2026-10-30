import "server-only";

// Toplantı modülü — sunucu public girişi (3.4): sorgular, action'lar, handler'lar.
// KARAR: modül yalnızca auth ve shared'e bağımlıdır (2. bölüm); documents/users/audit
// modüllerinden import YOKTUR (audit yazımı shared/audit üzerinden yapılır).

export { listMeetings, MEETING_SORTABLE_FIELDS, MEETING_DEFAULT_SORT } from "./queries/list-meetings";
export { getMeeting, getMeetingCore } from "./queries/get-meeting";
export { listActionItems, buildActionItemWhere } from "./queries/list-action-items";
export { getMeetingStats } from "./queries/get-meeting-stats";
export { listCopySources } from "./queries/list-copy-sources";

export { createMeetingAction, updateMeetingAction, deleteMeetingAction } from "./actions/meeting-actions";
export { changeMeetingStatusAction } from "./actions/change-status";
export {
  addAgendaItemAction,
  updateAgendaItemAction,
  deleteAgendaItemAction,
  moveAgendaItemAction,
  updateAgendaDiscussionAction,
} from "./actions/agenda-actions";
export {
  addAttendeeUsersAction,
  addAttendeeGuestAction,
  updateAttendeeAction,
  removeAttendeeAction,
  markAllAttendeesPresentAction,
} from "./actions/attendee-actions";
export { addDecisionAction, updateDecisionAction, deleteDecisionAction } from "./actions/decision-actions";
export {
  addActionItemAction,
  updateActionItemAction,
  setActionItemStatusAction,
  deleteActionItemAction,
} from "./actions/action-item-actions";
export { deleteMeetingFileAction } from "./actions/delete-file";

export { uploadMeetingFileHandler } from "./handlers/upload-file";
export { downloadMeetingFileHandler } from "./handlers/download-file";
export { exportMinutesPdfHandler } from "./handlers/export-minutes-pdf";

export type MeetingOption = { id: string; label: string };

/**
 * Seçim listeleri için toplantılar (başka modüller: görevler …): silinmemiş, en yeniden eskiye.
 * `ids` verilirse yalnızca onlar (silinmiş olsalar da etiket gösterilebilsin diye).
 */
export async function listMeetingOptions(options: { ids?: string[]; take?: number } = {}): Promise<MeetingOption[]> {
  const { getDb } = await import("@/shared/db");
  const meetings = await getDb().meeting.findMany({
    where: options.ids ? { id: { in: options.ids } } : { deletedAt: null },
    select: { id: true, meetingNumber: true, title: true },
    orderBy: { meetingDate: "desc" },
    ...(options.ids ? {} : { take: options.take ?? 100 }),
  });
  return meetings.map((meeting) => ({ id: meeting.id, label: `${meeting.meetingNumber} - ${meeting.title}` }));
}
export { listUpcomingMeetings } from "./queries/list-upcoming-meetings";
