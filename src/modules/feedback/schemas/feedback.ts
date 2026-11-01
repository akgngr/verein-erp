import { z } from "zod";

export const feedbackCreateSchema = z.object({
  type: z.enum(["BUG", "SUGGESTION"]),
  title: z.string().trim().min(3, "feedback.validation.title").max(150, "feedback.validation.titleMax"),
  description: z.string().trim().min(5, "feedback.validation.description").max(5000, "feedback.validation.descriptionMax"),
  pageUrl: z.string().trim().max(500).optional().default(""),
  userAgent: z.string().trim().max(500).optional().default(""),
  viewport: z.string().trim().max(40).optional().default(""),
});

export const feedbackUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NEW", "IN_PROGRESS", "DONE", "REJECTED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  reply: z.string().trim().max(3000).default(""),
});
