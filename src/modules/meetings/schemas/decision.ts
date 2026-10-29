import { z } from "zod";

/**
 * Karar şemaları (5. bölüm md. 9 ve 12).
 * KARAR: Oylar ya üçü birden boş (null kaydedilir) ya üçü birden sayıdır;
 * herhangi biri doluysa boş gelenler 0 sayılır.
 */

function emptyToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema,
  );
}

export const decisionResultSchema = z.enum(["ACCEPTED", "REJECTED", "POSTPONED"]);

const voteField = emptyToNull(
  z.coerce.number().int().min(0, "meetings.validation.votesRange").max(1000, "meetings.validation.votesRange").nullable(),
);

const decisionBaseObject = z.object({
  meetingId: z.string().trim().min(1),
  agendaItemId: emptyToNull(z.string().trim().min(1).nullable()),
  text: z
    .string()
    .trim()
    .min(3, "meetings.validation.decisionMin")
    .max(3000, "meetings.validation.decisionMax"),
  result: decisionResultSchema,
  votesFor: voteField,
  votesAgainst: voteField,
  votesAbstain: voteField,
});

type DecisionRaw = {
  votesFor: number | null;
  votesAgainst: number | null;
  votesAbstain: number | null;
};

/** KARAR: herhangi bir oy doluysa boş kalanlar 0 sayılır (5. bölüm md. 9). */
function normalizeVotes<T extends DecisionRaw>(data: T): T {
  const anyVote = data.votesFor !== null || data.votesAgainst !== null || data.votesAbstain !== null;
  if (!anyVote) return data;
  return {
    ...data,
    votesFor: data.votesFor ?? 0,
    votesAgainst: data.votesAgainst ?? 0,
    votesAbstain: data.votesAbstain ?? 0,
  };
}

export const decisionAddSchema = decisionBaseObject.transform(normalizeVotes);

export const decisionUpdateSchema = decisionBaseObject
  .extend({ id: z.string().trim().min(1) })
  .transform(normalizeVotes);

export const decisionDeleteSchema = z.object({ id: z.string().trim().min(1) });

export type DecisionAddInput = z.infer<typeof decisionAddSchema>;
export type DecisionUpdateInput = z.infer<typeof decisionUpdateSchema>;
export type DecisionDeleteInput = z.infer<typeof decisionDeleteSchema>;
