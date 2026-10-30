import type {
  CourseChargeStatus,
  CourseEnrollmentStatus,
  CourseFeeType,
  CourseKind,
  CoursePaymentMethod,
  CourseStatus,
} from "@prisma/client";

export const COURSE_KIND_VALUES: CourseKind[] = ["COURSE", "TUTORING"];
export const COURSE_FEE_TYPE_VALUES: CourseFeeType[] = ["FREE", "ONE_TIME", "MONTHLY", "INSTALLMENTS"];
export const COURSE_STATUS_VALUES: CourseStatus[] = ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"];
export const ENROLLMENT_STATUS_VALUES: CourseEnrollmentStatus[] = ["ACTIVE", "COMPLETED", "WITHDRAWN"];
export const CHARGE_STATUS_VALUES: CourseChargeStatus[] = ["OPEN", "PAID", "WAIVED", "CANCELLED"];
export const PAYMENT_METHOD_VALUES: CoursePaymentMethod[] = ["CASH", "BANK_TRANSFER", "SEPA_DEBIT", "CARD", "OTHER"];

/** Kurs kodu öneki: K-<yıl>-001. */
export const COURSE_CODE_PREFIX = "K";

/** Aylık ücretli kursta üretilebilecek en fazla ay (bitiş tarihi uzak girilse de). */
export const MAX_MONTHLY_CHARGES = 24;
export const MAX_INSTALLMENTS = 24;
