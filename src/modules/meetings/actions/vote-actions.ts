"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { DEFAULT_MIN_BALLOTS, LOWEST_MIN_BALLOTS, validateMinBallots, YES_NO_ABSTAIN } from "../lib/secret-ballot";
import { meetingsPermissions } from "../permissions";
import { assertMeetingEditable } from "../services/meeting-guards";
import { closeVote, issueBallot, openVote } from "../services/secret-ballot";

const id = z.string().min(1).max(64);
const actorOf = (user: { id: string; name: string; email: string }) => ({ id: user.id, label: buildUserLabel(user.name, user.email) });

/** Gizli oylama aç (RFC-004 aşama 3, yüz yüze). Seçenekler: evet/hayır/çekimser veya aday listesi. */
export async function openVoteAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: z.object({
      meetingId: id,
      agendaItemId: id.nullable().default(null),
      question: z.string().trim().min(3, "meetings.vote.errors.question").max(300),
      kind: z.enum(["yesNoAbstain", "candidates"]),
      candidates: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
      minBallots: z.number().int().min(LOWEST_MIN_BALLOTS).max(1000).default(DEFAULT_MIN_BALLOTS),
      minBallotsReason: z.string().trim().max(300).nullable().default(null),
    }),
    handler: async ({ input, user, audit }) => {
      const meeting = await getDb().meeting.findUnique({ where: { id: input.meetingId }, select: { status: true, deletedAt: true } });
      if (!meeting) throw new ActionError("meetings.errors.meetingNotFound");
      assertMeetingEditable(meeting, "content", user.role, meetingsPermissions);
      const options = input.kind === "yesNoAbstain" ? [...YES_NO_ABSTAIN] : [...new Set(input.candidates)];
      if (options.length < 2) throw new ActionError("meetings.vote.errors.options");
      const check = validateMinBallots(input.minBallots, input.minBallotsReason);
      if (check !== "ok") throw new ActionError(`meetings.vote.errors.${check}`); // i18n-ignore (dynamic key; every code exists in meetings.vote.errors)
      if (input.agendaItemId && !(await getDb().agendaItem.findFirst({ where: { id: input.agendaItemId, meetingId: input.meetingId }, select: { id: true } }))) throw new ActionError("meetings.errors.agendaNotFound");
      const result = await openVote(input.meetingId, { question: input.question, options, minBallots: input.minBallots, minBallotsReason: input.minBallots < DEFAULT_MIN_BALLOTS ? input.minBallotsReason : null, agendaItemId: input.agendaItemId }, actorOf(user));
      if (!result.ok) throw new ActionError(`meetings.vote.errors.${result.error}`); // i18n-ignore (dynamic key; every code exists in meetings.vote.errors)
      await audit({ action: "CREATE", entity: "MeetingVote", entityId: result.id, after: { meetingId: input.meetingId, minBallots: input.minBallots } });
      revalidatePath(`/toplantilar/${input.meetingId}`);
      return { id: result.id };
    },
  })(input);
}

/**
 * Giriş masası: yoklamada "katıldı" olan üyeye tek kullanımlık oy kodu verir. Kod yalnız bu yanıtta döner
 * (yazdırılır veya kabinde gösterilir); sunucuda yalnız özeti kalır. Denetim kaydı oy kimliğini içermez.
 */
export async function issueBallotAction(input: unknown): Promise<ActionResult<{ code: string; codes: string[] }>> {
  return createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: z.object({ meetingId: id, voteId: id, memberId: id }),
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const meeting = await db.meeting.findUnique({ where: { id: input.meetingId }, select: { status: true, deletedAt: true } });
      if (!meeting) throw new ActionError("meetings.errors.meetingNotFound");
      assertMeetingEditable(meeting, "content", user.role, meetingsPermissions);
      const vote = await db.meetingVote.findFirst({ where: { id: input.voteId, meetingId: input.meetingId }, select: { id: true } });
      if (!vote) throw new ActionError("meetings.vote.errors.voteNotOpen");
      const result = await issueBallot(input.voteId, input.memberId);
      if (!result.ok) throw new ActionError(`meetings.vote.errors.${result.error}`); // i18n-ignore (dynamic key; every code exists in meetings.vote.errors)
      await audit({ action: "UPDATE", entity: "MeetingVote", entityId: input.voteId, after: { ballotIssued: true } });
      return { code: result.code, codes: result.codes };
    },
  })(input);
}

export async function closeVoteAction(input: unknown): Promise<ActionResult<{ published: boolean; ballotCount: number }>> {
  return createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: z.object({ meetingId: id, voteId: id, decisionText: z.string().trim().max(2000).nullable().default(null) }),
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const meeting = await db.meeting.findUnique({ where: { id: input.meetingId }, select: { status: true, deletedAt: true } });
      if (!meeting) throw new ActionError("meetings.errors.meetingNotFound");
      assertMeetingEditable(meeting, "content", user.role, meetingsPermissions);
      const vote = await db.meetingVote.findFirst({ where: { id: input.voteId, meetingId: input.meetingId }, select: { id: true } });
      if (!vote) throw new ActionError("meetings.vote.errors.voteNotOpen");
      const result = await closeVote(input.voteId, input.decisionText);
      if (!result.ok) throw new ActionError(`meetings.vote.errors.${result.error}`); // i18n-ignore (dynamic key; every code exists in meetings.vote.errors)
      await audit({ action: "UPDATE", entity: "MeetingVote", entityId: input.voteId, after: { closed: true, ballotCount: result.ballotCount, published: result.published } });
      revalidatePath(`/toplantilar/${input.meetingId}`);
      return { published: result.published, ballotCount: result.ballotCount };
    },
  })(input);
}
