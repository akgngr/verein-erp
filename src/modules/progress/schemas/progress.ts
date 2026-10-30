import { z } from "zod";

import { GRADE_PATTERN } from "../constants";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const attendanceSchema = z.object({
  courseId: z.string().min(1),
  sessionId: z.string().min(1),
  entries: z
    .array(
      z.object({
        enrollmentId: z.string().min(1),
        status: z.enum(["PRESENT", "ABSENT", "EXCUSED", "LATE"]),
        note: z.string().trim().max(200, "progress.validation.textMax"),
      }),
    )
    .min(1),
});

export const assessmentSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(2, "progress.validation.titleRequired").max(120, "progress.validation.textMax"),
  date: z.string().trim().regex(DATE_ONLY, "progress.validation.dateInvalid"),
  type: z.enum(["EXAM", "HOMEWORK", "ORAL", "PROJECT", "OTHER"]),
  maxPoints: z.string().trim().refine((value) => value === "" || /^\d+([.,]\d{1,2})?$/.test(value), "progress.validation.pointsInvalid"),
});
export const assessmentDeleteSchema = z.object({ id: z.string().min(1) });

export const gradesSchema = z.object({
  assessmentId: z.string().min(1),
  entries: z.array(
    z.object({
      enrollmentId: z.string().min(1),
      points: z.string().trim().refine((value) => value === "" || /^\d+([.,]\d{1,2})?$/.test(value), "progress.validation.pointsInvalid"),
      grade: z.string().trim().refine((value) => value === "" || GRADE_PATTERN.test(value), "progress.validation.gradeInvalid"),
      comment: z.string().trim().max(300, "progress.validation.textMax"),
    }),
  ),
});

export const noteSchema = z.object({
  courseId: z.string().min(1),
  enrollmentId: z.string().min(1),
  date: z.string().trim().regex(DATE_ONLY, "progress.validation.dateInvalid"),
  rating: z.string().trim().refine((value) => value === "" || /^[1-5]$/.test(value), "progress.validation.ratingInvalid"),
  text: z.string().trim().min(3, "progress.validation.noteRequired").max(2000, "progress.validation.textMax"),
  goals: z.string().trim().max(1000, "progress.validation.textMax"),
});
export const noteDeleteSchema = z.object({ id: z.string().min(1) });

export function parsePoints(value: string): number | null {
  return value === "" ? null : Number(value.replace(",", "."));
}
