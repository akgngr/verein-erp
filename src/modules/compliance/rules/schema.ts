import { z } from "zod";

/** RFC-005 §2 / ADR 0009 rule format. Rules are data; CI validates every JSON file with this schema. */
const text = z.object({ tr: z.string().min(1), de: z.string().min(1) }).strict();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const complianceRuleSchema = z
  .object({
    id: z.string().regex(/^[a-z]+(\.[a-z0-9-]+)+$/),
    version: z.number().int().min(1),
    title: text,
    legalSource: z.array(z.object({ norm: z.string().min(2), url: z.string().url().optional(), note: text.optional() }).strict()).min(1),
    jurisdiction: z.string().regex(/^DE(-[A-Z]{2})?$/),
    effective: z.object({ from: isoDate, to: isoDate.nullable() }).strict(),
    metric: z.string().regex(/^[a-z][a-z0-9-]*\.[a-zA-Z][a-zA-Z0-9]*$/),
    params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
    condition: z
      .object({ op: z.enum(["lt", "lte", "gt", "gte", "eq", "daysUntilLte", "missing"]), value: z.union([z.number(), z.string()]).optional() })
      .strict(),
    severity: z.enum(["info", "warn", "critical"]),
    finding: text,
    suggestedTask: z
      .object({ title: text, dueInDays: z.number().int().min(0).max(365), role: z.enum(["TREASURER", "BOARD", "SECRETARY"]) })
      .strict()
      .optional(),
    review: z
      .object({
        status: z.enum(["draft", "reviewed", "retired"]),
        reviewerRole: z.enum(["tax-advisor", "board", "owner"]),
        reviewedAt: isoDate.optional(),
        reviewedBy: z.string().min(1).optional(),
      })
      .strict()
      .refine((review) => review.status !== "reviewed" || (review.reviewedAt && review.reviewedBy), "reviewed rules need reviewedAt and reviewedBy"),
  })
  .strict()
  .refine((rule) => rule.effective.to === null || rule.effective.to >= rule.effective.from, "effective.to before effective.from")
  .refine((rule) => rule.condition.op === "missing" || rule.condition.value !== undefined, "condition.value required");

export type ComplianceRule = z.infer<typeof complianceRuleSchema>;
