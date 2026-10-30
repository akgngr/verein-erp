import { z } from "zod";

import { parseEuroToCents } from "../utils";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const text = (max: number) => z.string().trim().max(max, "courses.validation.textMax");
const optionalDate = z.string().trim().refine((value) => value === "" || DATE_ONLY.test(value), "courses.validation.dateInvalid");

export const courseSchema = z
  .object({
    kind: z.enum(["COURSE", "TUTORING"]),
    title: z.string().trim().min(2, "courses.validation.titleRequired").max(150, "courses.validation.textMax"),
    subject: text(80),
    description: text(2000),
    level: text(80),
    location: text(120),
    scheduleNote: text(120),
    startDate: z.string().trim().regex(DATE_ONLY, "courses.validation.startDateRequired"),
    endDate: optionalDate,
    capacity: z.string().trim().refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0), "courses.validation.capacityInvalid"),
    feeType: z.enum(["FREE", "ONE_TIME", "MONTHLY", "INSTALLMENTS"]),
    fee: z.string().trim(),
    installmentCount: z.string().trim(),
    status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]),
    teacherIds: z.array(z.string().min(1)),
  })
  .superRefine((value, ctx) => {
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "courses.validation.endBeforeStart" });
    }
    if (value.feeType !== "FREE") {
      const cents = parseEuroToCents(value.fee);
      if (cents === null || cents <= 0) ctx.addIssue({ code: "custom", path: ["fee"], message: "courses.validation.feeInvalid" });
    }
    if (value.feeType === "INSTALLMENTS") {
      const count = Number(value.installmentCount);
      if (!Number.isInteger(count) || count < 2 || count > 24) {
        ctx.addIssue({ code: "custom", path: ["installmentCount"], message: "courses.validation.installmentsInvalid" });
      }
    }
    if (value.feeType === "MONTHLY" && !value.endDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "courses.validation.endDateForMonthly" });
    }
  });

export const courseUpdateSchema = courseSchema.and(z.object({ id: z.string().min(1) }));
export const courseDeleteSchema = z.object({ id: z.string().min(1) });

export const sessionSchema = z
  .object({
    courseId: z.string().min(1),
    date: z.string().trim().regex(DATE_ONLY, "courses.validation.dateInvalid"),
    startTime: z.string().trim().refine((value) => value === "" || TIME.test(value), "courses.validation.timeInvalid"),
    endTime: z.string().trim().refine((value) => value === "" || TIME.test(value), "courses.validation.timeInvalid"),
    topic: text(200),
    teacherId: z.string().trim(),
    isCancelled: z.boolean(),
    note: text(500),
  })
  .refine((value) => !value.startTime || !value.endTime || value.endTime > value.startTime, {
    path: ["endTime"],
    message: "courses.validation.endBeforeStartTime",
  });
export const sessionUpdateSchema = sessionSchema.and(z.object({ id: z.string().min(1) }));
export const sessionDeleteSchema = z.object({ id: z.string().min(1) });
export const sessionSeriesSchema = z.object({
  courseId: z.string().min(1),
  weekday: z.coerce.number().int().min(1).max(7),
  startTime: z.string().trim().refine((value) => value === "" || TIME.test(value), "courses.validation.timeInvalid"),
  endTime: z.string().trim().refine((value) => value === "" || TIME.test(value), "courses.validation.timeInvalid"),
});

export type CourseInput = z.infer<typeof courseSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
