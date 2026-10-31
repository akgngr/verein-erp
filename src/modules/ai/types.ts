/**
 * Asistanın onay kartı önerileri (sunucu araçları üretir, panel gösterir, kullanıcı onaylayınca
 * executeAiProposalAction uygular). Kişi adı içermez; başlıklar kaydın kendi başlığıdır.
 */
export type AiProposal =
  /** Modül AI standardı (src/modules/<modül>/ai.ts): genel onay kartı. */
  | { kind: "module"; module: string; action: string; operation: "read" | "create" | "update" | "delete"; title: string; details: string[]; payload: unknown }
  | {
      kind: "createEvent";
      title: string;
      description: string | null;
      type: "WORKSHOP" | "SEMINAR" | "SOCIAL" | "CULTURAL" | "SPORTS" | "OTHER";
      startDate: string;
      endDate: string | null;
      location: string | null;
      isOnline: boolean;
    }
  | {
      kind: "createDocument";
      title: string;
      direction: "INCOMING" | "OUTGOING";
      documentDate: string;
      counterparty: string;
      summary: string | null;
      dueDate: string | null;
    }
  | { kind: "changeDocumentStatus"; documentId: string; title: string; status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED" }
  | { kind: "deleteDocument"; documentId: string; title: string }
  | {
      kind: "createMeeting";
      title: string;
      type: "BOARD" | "GENERAL_ASSEMBLY" | "COMMITTEE" | "OTHER";
      meetingDate: string;
      startTime: string | null;
      location: string | null;
      description: string | null;
    }
  | { kind: "changeMeetingStatus"; meetingId: string; title: string; status: "PLANNED" | "HELD" | "APPROVED" | "CANCELLED"; reason: string | null }
  | { kind: "deleteMeeting"; meetingId: string; title: string }
  | {
      kind: "createInventory";
      title: string;
      category: "ELECTRONICS" | "FURNITURE" | "KITCHEN" | "OFFICE" | "SPORTS" | "OTHER";
      quantity: number;
      status: "IN_USE" | "IDLE" | "BROKEN" | "SCRAPPED";
      location: string | null;
      description: string | null;
    }
  | { kind: "changeInventoryStatus"; itemId: string; title: string; status: "IN_USE" | "IDLE" | "BROKEN" | "SCRAPPED" }
  | { kind: "deleteInventory"; itemId: string; title: string }
  | {
      kind: "createCourse";
      title: string;
      courseKind: "COURSE" | "TUTORING";
      subject: string | null;
      startDate: string;
      endDate: string | null;
      description: string | null;
    }
  | { kind: "changeCourseStatus"; courseId: string; title: string; status: "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED" }
  | { kind: "deleteCourse"; courseId: string; title: string };

export type AiProposalKind = AiProposal["kind"];
