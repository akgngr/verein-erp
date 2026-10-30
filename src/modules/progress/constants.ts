import type { ProgressAssessmentType, ProgressAttendanceStatus } from "@prisma/client";

export const ATTENDANCE_STATUS_VALUES: ProgressAttendanceStatus[] = ["PRESENT", "ABSENT", "EXCUSED", "LATE"];
export const ASSESSMENT_TYPE_VALUES: ProgressAssessmentType[] = ["EXAM", "HOMEWORK", "ORAL", "PROJECT", "OTHER"];
/** Almanya okul notları (1 = sehr gut … 6 = ungenügend), +/- ile. */
export const GRADE_PATTERN = /^[1-6][+-]?$/;
