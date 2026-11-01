import type {
  CourseChargeKind,
  CourseChargeStatus,
  CourseEnrollmentStatus,
  CourseFeeType,
  CourseKind,
  CoursePaymentMethod,
  CourseStatus,
} from "@prisma/client";

export type {
  CourseChargeKind,
  CourseChargeStatus,
  CourseEnrollmentStatus,
  CourseFeeType,
  CourseKind,
  CoursePaymentMethod,
  CourseStatus,
};

export type CourseRow = {
  id: string;
  code: string;
  kind: CourseKind;
  title: string;
  subject: string | null;
  startDate: Date;
  endDate: Date | null;
  feeType: CourseFeeType;
  feeCents: number;
  status: CourseStatus;
  capacity: number | null;
  enrolledCount: number;
  teacherNames: string[];
};

export type CourseDetail = {
  id: string;
  code: string;
  kind: CourseKind;
  title: string;
  subject: string | null;
  description: string | null;
  level: string | null;
  location: string | null;
  scheduleNote: string | null;
  startDate: Date;
  endDate: Date | null;
  capacity: number | null;
  feeType: CourseFeeType;
  feeCents: number;
  installmentCount: number | null;
  status: CourseStatus;
  createdByLabel: string;
  teacherIds: string[];
  teachers: { id: string; name: string }[];
};

export type SessionRow = {
  id: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  topic: string | null;
  teacherId: string | null;
  teacherName: string | null;
  isCancelled: boolean;
  note: string | null;
};

export type EnrollmentRow = {
  id: string;
  studentId: string;
  studentLabel: string;
  studentNumber: string;
  payerLabel: string | null;
  payerDebtorNumber: number | null;
  enrolledAt: Date;
  status: CourseEnrollmentStatus;
  discountPercent: number;
  note: string | null;
  openCents: number;
};

export type ChargeRow = {
  id: string;
  enrollmentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  studentLabel: string;
  payerLabel: string | null;
  payerDebtorNumber: number | null;
  kind: CourseChargeKind;
  sequence: number;
  total: number;
  period: string | null;
  dueDate: Date;
  amountCents: number;
  status: CourseChargeStatus;
  isOverdue: boolean;
  payment: { id: string; paidAt: Date; method: CoursePaymentMethod; bookingNumber: string | null } | null;
};

export type TeacherRow = {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  subjects: string | null;
  note: string | null;
  isActive: boolean;
  courseCount: number;
  compensation: "NONE" | "HONORAR" | "UEBUNGSLEITER" | "EHRENAMT";
  rateCents: number | null;
  rateUnit: "HOUR" | "SESSION";
  /** Bağlı kullanıcının profilinde IBAN kayıtlı mı (IBAN'ın kendisi dönmez). */
  hasPaymentProfile: boolean;
};

/** Öğrenci takibi modülü için: kursun yoklama/not listesi. */
export type CourseRoster = {
  course: { id: string; code: string; title: string; kind: CourseKind; startDate: Date; endDate: Date | null };
  sessions: { id: string; date: Date; startTime: string | null; topic: string | null; isCancelled: boolean }[];
  enrollments: { id: string; studentId: string; studentLabel: string; studentNumber: string; status: CourseEnrollmentStatus }[];
  teacherNames: string[];
};
