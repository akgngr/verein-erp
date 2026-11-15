import { z } from "zod";

/** Query fields contain no identity selectors; export columns are a separate allowlist. */
export const duesDatasetQuerySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  status: z.enum(["OVERDUE", "OPEN", "PARTIAL", "PAID", "WAIVED", "ALL"]).optional(),
  minimumRemainingCents: z.number().int().min(0).max(100_000_000).optional(),
  maximumRemainingCents: z.number().int().min(0).max(100_000_000).optional(),
}).strict();
export type DuesDatasetQuery = z.infer<typeof duesDatasetQuerySchema>;

export function parseDuesDatasetQuery(value: unknown): DuesDatasetQuery {
  const query = duesDatasetQuerySchema.parse(value);
  if (query.minimumRemainingCents !== undefined && query.maximumRemainingCents !== undefined && query.minimumRemainingCents > query.maximumRemainingCents) {
    throw new Error("AI_DATASET_INVALID_RANGE");
  }
  return query;
}

export function matchesDuesDatasetAmount(remainingCents: number, query: DuesDatasetQuery): boolean {
  return remainingCents >= (query.minimumRemainingCents ?? 0) && remainingCents <= (query.maximumRemainingCents ?? Number.MAX_SAFE_INTEGER);
}
