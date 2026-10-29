import { z } from "zod";
import { MAIL_SECURITY_OPTIONS, MAIL_TRANSPORTS } from "../constants";
import { isValidEmail } from "../helpers/mail-helpers";

/**
 * Error messages are i18n keys relative to the `mail` namespace,
 * so the client can translate them with `t(message)`.
 */
const optionalEmail = z
  .string()
  .trim()
  .max(320, "validation.tooLong")
  .refine((value) => value === "" || isValidEmail(value), "validation.emailInvalid")
  .optional();

export const mailSettingsSchema = z
  .object({
    transport: z.enum(MAIL_TRANSPORTS),
    host: z.string().trim().max(255, "validation.tooLong").optional(),
    port: z
      .number()
      .int("validation.portInvalid")
      .min(1, "validation.portInvalid")
      .max(65535, "validation.portInvalid"),
    security: z.enum(MAIL_SECURITY_OPTIONS),
    username: z.string().trim().max(255, "validation.tooLong").optional(),
    /** Empty = keep the stored password. */
    password: z.string().max(500, "validation.tooLong").optional(),
    fromAddress: optionalEmail,
    fromName: z.string().trim().max(200, "validation.tooLong").optional(),
    replyTo: optionalEmail,
  })
  .superRefine((values, ctx) => {
    if (values.transport !== "SMTP") return;
    if (!values.host) {
      ctx.addIssue({ code: "custom", path: ["host"], message: "validation.hostRequired" });
    }
    if (!values.fromAddress) {
      ctx.addIssue({
        code: "custom",
        path: ["fromAddress"],
        message: "validation.fromAddressRequired",
      });
    }
  });

export const mailTestSchema = z.object({
  to: z
    .string()
    .trim()
    .min(1, "validation.emailRequired")
    .max(320, "validation.tooLong")
    .refine(isValidEmail, "validation.emailInvalid"),
});

/** Validation of the public MailMessage contract. */
export const mailMessageSchema = z.object({
  to: z.string().trim().refine(isValidEmail),
  toName: z.string().trim().max(200).optional(),
  subject: z.string().trim().min(1).max(998),
  text: z.string().min(1),
  html: z.string().optional(),
  replyTo: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidEmail(value))
    .optional(),
  context: z.object({
    module: z.string().trim().min(1).max(100),
    reference: z.string().trim().max(200).optional(),
  }),
});

export type MailSettingsFormValues = z.infer<typeof mailSettingsSchema>;
export type MailTestFormValues = z.infer<typeof mailTestSchema>;
