import { z } from "zod";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const enrollSchema = z.object({
  courseId: z.string().min(1),
  studentIds: z.array(z.string().min(1)).min(1, "courses.validation.selectStudent"),
  enrolledAt: z.string().trim().regex(DATE_ONLY, "courses.validation.dateInvalid"),
  discountPercent: z.coerce.number().int().min(0, "courses.validation.discountInvalid").max(100, "courses.validation.discountInvalid"),
});

export const enrollmentStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "COMPLETED", "WITHDRAWN"]),
});

export const paymentSchema = z.object({
  chargeId: z.string().min(1),
  paidAt: z.string().trim().regex(DATE_ONLY, "courses.validation.dateInvalid"),
  method: z.enum(["CASH", "BANK_TRANSFER", "SEPA_DEBIT", "CARD", "OTHER"]),
  reference: z.string().trim().max(80, "courses.validation.textMax"),
});

export const reversePaymentSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().trim().min(5, "courses.validation.reasonMin").max(300, "courses.validation.textMax"),
});

export const waiveChargeSchema = z.object({
  chargeId: z.string().min(1),
  reason: z.string().trim().min(5, "courses.validation.reasonMin").max(300, "courses.validation.textMax"),
});

export const settingsSchema = z.object({ incomeCategoryId: z.string().trim() });
