import type { ProgressAssessmentType, ProgressAttendanceStatus } from "@prisma/client";

export type { ProgressAssessmentType, ProgressAttendanceStatus };

export type AttendanceMap = Record<string, Record<string, { status: ProgressAttendanceStatus; note: string | null }>>; // sessionId → enrollmentId → kayıt

export type AttendanceSummary = { enrollmentId: string; present: number; late: number; excused: number; absent: number; recorded: number; rate: number | null };

export type AssessmentRow = {
  id: string;
  title: string;
  date: Date;
  type: ProgressAssessmentType;
  maxPoints: number | null;
  grades: Record<string, { points: number | null; grade: string | null; comment: string | null }>; // enrollmentId →
};

export type NoteRow = {
  id: string;
  enrollmentId: string;
  date: Date;
  rating: number | null;
  text: string;
  goals: string | null;
  authorId: string;
  authorLabel: string;
};
