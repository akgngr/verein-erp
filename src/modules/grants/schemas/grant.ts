import { z } from "zod";

import { FINANCING_TYPES } from "../lib/financing";
import { STATUSES } from "../lib/statuses";

const id = z.string().min(1).max(64);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "grants.errors.date");
const cents = z.number().int().min(0).max(10_000_000_000);
const text = (max: number) => z.string().trim().max(max).transform((value) => value || null);

export const grantSchema = z.object({
  id: id.nullable(),
  name: z.string().trim().min(2, "grants.errors.name").max(200),
  funder: z.string().trim().min(2, "grants.errors.funder").max(200),
  fileNumber: text(100),
  purpose: text(4000),
  status: z.enum(STATUSES),
  financingType: z.enum(FINANCING_TYPES),
  sharePercent: z.number().int().min(1).max(100).nullable(),
  approvedCents: cents.nullable(),
  ownShareCents: cents,
  thirdPartyCents: cents,
  periodStart: date,
  periodEnd: date,
  reportDueAt: date.nullable(),
  projectId: id.nullable(),
  useNetAmounts: z.boolean(),
})
  .refine((value) => value.periodStart <= value.periodEnd, { message: "grants.errors.period", path: ["periodEnd"] })
  // A missing rate must not silently become 100 % funding (Anteilfinanzierung needs its percentage).
  .refine((value) => value.financingType !== "ANTEIL" || value.sharePercent !== null, { message: "grants.errors.sharePercent", path: ["sharePercent"] })
  .transform((value) => ({ ...value, sharePercent: value.financingType === "ANTEIL" ? value.sharePercent : null }));
