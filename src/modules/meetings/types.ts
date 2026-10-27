import type {
  ActionItemStatus,
  AttendeeRole,
  AttendanceStatus,
  DecisionResult,
  MeetingStatus,
  MeetingType,
} from "@prisma/client";

/** Toplantı listesi satırı (7.1). */
export type MeetingListItem = {
  id: string;
  meetingNumber: string;
  type: MeetingType;
  title: string;
  meetingDate: Date;
  startTime: string | null;
  location: string | null;
  status: MeetingStatus;
  decisionCount: number;
  openActionItemCount: number;
};

/** Katılımcı satırı (7.3 Katılımcılar). */
export type AttendeeItem = {
  id: string;
  userId: string | null;
  name: string;
  role: AttendeeRole;
  attendance: AttendanceStatus;
  note: string | null;
};

/** Gündem maddesi satırı (7.3 Gündem). */
export type AgendaItemDetail = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  discussion: string | null;
  decisionCount: number;
};

/** Karar satırı (7.3 Kararlar). */
export type DecisionItem = {
  id: string;
  decisionNumber: string;
  text: string;
  result: DecisionResult;
  agendaItemId: string | null;
  agendaItemTitle: string | null;
  votesFor: number | null;
  votesAgainst: number | null;
  votesAbstain: number | null;
};

/** Görev satırı (7.3 Görevler ve 7.4 görev listesi). */
export type ActionItemRow = {
  id: string;
  meetingId: string;
  meetingNumber: string;
  meetingTitle: string;
  description: string;
  assigneeId: string | null;
  assigneeLabel: string | null;
  dueDate: Date | null;
  status: ActionItemStatus;
  decisionId: string | null;
  decisionNumber: string | null;
};

/** Ek satırı (7.3 Ekler). */
export type MeetingFileItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedByLabel: string;
  createdAt: Date;
};

/** Yeter sayısı hesabı (5. bölüm md. 8). */
export type QuorumInfo = {
  presentCount: number;
  required: number | null;
  reached: boolean | null;
};

/** Toplantı detayı (get-meeting, 7.3). */
export type MeetingDetail = {
  id: string;
  meetingNumber: string;
  year: number;
  sequence: number;
  type: MeetingType;
  title: string;
  meetingDate: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  description: string | null;
  quorumRequired: number | null;
  status: MeetingStatus;
  approvedAt: Date | null;
  approvedByLabel: string | null;
  createdById: string;
  createdByLabel: string;
  createdAt: Date;
  updatedAt: Date;
  agendaItems: AgendaItemDetail[];
  attendees: AttendeeItem[];
  decisions: DecisionItem[];
  actionItems: ActionItemRow[];
  files: MeetingFileItem[];
  quorum: QuorumInfo;
};

/** Kopyalama kaynağı seçenekleri (7.2). */
export type CopySourceOption = {
  id: string;
  meetingNumber: string;
  title: string;
  meetingDate: Date;
};

/** Görev listesi filtre anahtarları (7.4). */
export type ActionItemListFilterKeys =
  | "status"
  | "assigneeId"
  | "mine"
  | "overdue"
  | "from"
  | "to";

/** Toplantı listesi filtre anahtarları (7.1). */
export type MeetingListFilterKeys = "type" | "status" | "from" | "to";

/** Görev seçenekleri (7.4 "Sorumlu" filtresi). */
export type MeetingStats = {
  plannedCount: number;
  nextMeeting: {
    id: string;
    meetingNumber: string;
    title: string;
    meetingDate: Date;
  } | null;
  draftMinutesCount: number;
  openActionItems: number;
  overdueActionItems: number;
};
