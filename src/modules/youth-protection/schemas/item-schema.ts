import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Mesajlar çeviri anahtarıdır (messages/<dil>.json → validation); form ve action aynı şemayı kullanır. */
export const youthProtectionItemSchema = z.object({
  personName: z
    .string()
    .trim()
    .min(1, "youth-protection.validation.personNameRequired")
    .max(120, "youth-protection.validation.personNameMax"),
  memberId: z.string().trim().max(100).nullable().optional(),
  userId: z.string().trim().max(100).nullable().optional(),
  inspectionDate: z
    .string()
    .trim()
    .regex(DATE_REGEX, "youth-protection.validation.inspectionDateInvalid"),
  certificateIssueDate: z
    .string()
    .trim()
    .regex(DATE_REGEX, "youth-protection.validation.certificateIssueDateInvalid"),
  inspectingOfficer: z
    .string()
    .trim()
    .min(1, "youth-protection.validation.inspectingOfficerRequired")
    .max(120, "youth-protection.validation.inspectingOfficerMax"),
  nextDueDate: z
    .string()
    .trim()
    .regex(DATE_REGEX, "youth-protection.validation.nextDueDateInvalid"),
  note: z.string().trim().max(500, "youth-protection.validation.noteMax").nullable().optional(),
});

export const youthProtectionItemUpdateSchema = youthProtectionItemSchema.extend({
  id: z.string().min(1),
});

export const youthProtectionItemDeleteSchema = z.object({
  id: z.string().min(1),
});

export type YouthProtectionItemInput = z.infer<typeof youthProtectionItemSchema>;
