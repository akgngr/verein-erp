import "server-only";

import { getDb } from "@/shared/db";

import {
  addMonthsUtc,
  ballotListHash,
  hashBallotCode,
  isBallotCodeShape,
  minutePrecision,
  newBallotCode,
  newBallotId,
  newReceiptCode,
  normalizeBallotCode,
  RETENTION_MONTHS,
  shuffled,
  tally,
  yesNoResult,
} from "../lib/secret-ballot";
import { berlinYear } from "../utils";
import { allocateDecisionNumber, runWithNumberRetry } from "./meeting-number";

/**
 * In-person secret ballot (RFC-004 phase 3, #522). Three stores without a shared key:
 * - eligibility (who received a ballot; no vote content),
 * - credential (hash only; no member, no time; deleted at close),
 * - ballot box (no member, time, order, session or IP).
 * Issuing is authenticated (secretary at the check-in desk); casting is anonymous and needs only the code.
 */

export type Actor = { id: string; label: string };
export type VoteError = "meetingNotFound" | "voteNotOpen" | "notPresent" | "alreadyIssued" | "invalidCode" | "invalidChoice";
type Fail = { ok: false; error: VoteError };

export async function openVote(meetingId: string, input: { question: string; options: string[]; minBallots: number; minBallotsReason: string | null; agendaItemId: string | null }, actor: Actor) {
  const db = getDb();
  const meeting = await db.meeting.findFirst({ where: { id: meetingId, deletedAt: null }, select: { id: true } });
  if (!meeting) return { ok: false, error: "meetingNotFound" } as Fail;
  const vote = await db.meetingVote.create({
    data: { meetingId, agendaItemId: input.agendaItemId, question: input.question, options: input.options, minBallots: input.minBallots, minBallotsReason: input.minBallotsReason, createdById: actor.id, createdByLabel: actor.label },
    select: { id: true },
  });
  return { ok: true as const, id: vote.id };
}

/**
 * Check-in desk: the member must be a PRESENT attendee with a member id. Creates the eligibility row and a one-time
 * credential in one transaction and returns the plain code ONCE (printed or shown on the kiosk). Nothing links the
 * credential to the member: the credential row has no member id and no time.
 */
export async function issueBallot(voteId: string, memberId: string): Promise<{ ok: true; code: string } | Fail> {
  const db = getDb();
  const vote = await db.meetingVote.findUnique({ where: { id: voteId }, select: { status: true, meetingId: true } });
  if (!vote || vote.status !== "OPEN") return { ok: false, error: "voteNotOpen" };
  const attendee = await db.meetingAttendee.findFirst({ where: { meetingId: vote.meetingId, memberId, attendance: "PRESENT" }, select: { id: true } });
  if (!attendee) return { ok: false, error: "notPresent" };
  const code = newBallotCode();
  try {
    await db.$transaction([
      db.meetingVoteEligibility.create({ data: { voteId, memberId, weight: 1, usedAt: minutePrecision(new Date()) } }),
      db.meetingVoteCredential.create({ data: { voteId, credentialHash: hashBallotCode(code), weight: 1 } }),
    ]);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return { ok: false, error: "alreadyIssued" };
    throw error;
  }
  return { ok: true, code };
}

/** Public question for the kiosk after the code was typed (no personal data). */
export async function loadBallot(code: string) {
  const normalized = normalizeBallotCode(code);
  if (!isBallotCodeShape(normalized)) return null;
  const credential = await getDb().meetingVoteCredential.findUnique({ where: { credentialHash: hashBallotCode(normalized) }, select: { spent: true, vote: { select: { question: true, options: true, status: true } } } });
  if (!credential || credential.spent || credential.vote.status !== "OPEN") return null;
  return { question: credential.vote.question, options: credential.vote.options };
}

/**
 * Anonymous cast. The code is the only input that identifies anything; this function never reads a session,
 * cookie, IP or user agent. Spending the credential and inserting the ballot happen in one transaction, and the
 * conditional update makes a second concurrent cast with the same code fail.
 */
export async function castBallot(code: string, choice: string): Promise<{ ok: true; receipt: string } | Fail> {
  const normalized = normalizeBallotCode(code);
  if (!isBallotCodeShape(normalized)) return { ok: false, error: "invalidCode" };
  const credentialHash = hashBallotCode(normalized);
  const db = getDb();
  return db.$transaction(async (tx) => {
    const credential = await tx.meetingVoteCredential.findUnique({ where: { credentialHash }, select: { voteId: true, weight: true, spent: true, vote: { select: { status: true, options: true } } } });
    if (!credential || credential.spent || credential.vote.status !== "OPEN") return { ok: false, error: "invalidCode" } as Fail;
    if (!credential.vote.options.includes(choice)) return { ok: false, error: "invalidChoice" } as Fail;
    const spent = await tx.meetingVoteCredential.updateMany({ where: { credentialHash, spent: false }, data: { spent: true } });
    if (spent.count !== 1) return { ok: false, error: "invalidCode" } as Fail;
    const receipt = newReceiptCode();
    await tx.meetingVoteBallot.create({ data: { id: newBallotId(), voteId: credential.voteId, choice, weight: credential.weight, batch: 1, ballotNonce: receipt } });
    return { ok: true as const, receipt };
  });
}

/**
 * Close: tally, hash, publish receipts without choices, delete credentials, null `usedAt`, set the retention date.
 * Below `minBallots` the totals are withheld (the chair holds an open vote or postpones; never silent).
 * A yes/no/abstain vote creates the meeting decision with the totals.
 */
export async function closeVote(voteId: string, decisionText: string | null) {
  const db = getDb();
  return runWithNumberRetry(() =>
    db.$transaction(async (tx) => {
      const vote = await tx.meetingVote.findUnique({
        where: { id: voteId },
        select: { id: true, status: true, options: true, minBallots: true, meetingId: true, agendaItemId: true, question: true, meeting: { select: { meetingDate: true } } },
      });
      if (!vote || vote.status !== "OPEN") return { ok: false, error: "voteNotOpen" } as Fail;

      // Atomically claim OPEN -> CLOSED inside the transaction before reading/rewriting ballots (#579)
      // so no concurrent castBallot or closeVote can race between reading and replacing the ballot box.
      const claimed = await tx.meetingVote.updateMany({
        where: { id: voteId, status: "OPEN" },
        data: { status: "CLOSED" },
      });
      if (claimed.count !== 1) return { ok: false, error: "voteNotOpen" } as Fail;

      await tx.meetingVoteCredential.deleteMany({ where: { voteId } });
      const ballots = await tx.meetingVoteBallot.findMany({ where: { voteId }, select: { choice: true, weight: true, ballotNonce: true } });
      const totals = tally(vote.options, ballots);
      const published = ballots.length >= vote.minBallots;
      const closedAt = new Date();
      const result = published ? yesNoResult(vote.options, totals) : null;

      // Re-write the ballot box in random order with fresh ids in ONE transaction: PostgreSQL keeps the creating
      // transaction id (xmin) per row, which would otherwise reveal the casting order and tie each ballot to the
      // transaction that spent its credential. Afterwards all ballots share one xmin. Dead tuples disappear at the
      // next (auto)vacuum; the runbook recommends `VACUUM "MeetingVoteBallot"` after an assembly.
      await tx.meetingVoteBallot.deleteMany({ where: { voteId } });
      if (ballots.length) {
        await tx.meetingVoteBallot.createMany({
          data: shuffled(ballots).map((ballot) => ({ id: newBallotId(), voteId, choice: ballot.choice, weight: ballot.weight, batch: 1, ballotNonce: ballot.ballotNonce })),
        });
      }
      await tx.meetingVoteEligibility.updateMany({ where: { voteId }, data: { usedAt: null } });
      await tx.meetingVote.update({
        where: { id: voteId },
        data: {
          status: "CLOSED",
          closedAt,
          retainUntil: addMonthsUtc(closedAt, RETENTION_MONTHS),
          ballotCount: ballots.length,
          totals: published ? totals : undefined,
          ballotHash: ballotListHash(ballots),
          receipts: shuffled(ballots.map((ballot) => ballot.ballotNonce)),
        },
      });
      if (result) {
        const year = berlinYear(vote.meeting.meetingDate);
        const { sequence, decisionNumber } = await allocateDecisionNumber(tx, year);
        await tx.meetingDecision.create({
          data: {
            meetingId: vote.meetingId,
            agendaItemId: vote.agendaItemId,
            year,
            sequence,
            decisionNumber,
            text: decisionText?.trim() || vote.question,
            result,
            votesFor: totals.yes,
            votesAgainst: totals.no,
            votesAbstain: totals.abstain,
          },
        });
      }
      return { ok: true as const, published, ballotCount: ballots.length };
    }),
  );
}

/** Votes of a meeting for the detail page. Never returns ballots, credentials or eligibility member ids. */
export async function listVotes(meetingId: string) {
  const rows = await getDb().meetingVote.findMany({
    where: { meetingId },
    orderBy: { createdAt: "asc" },
    select: { id: true, question: true, options: true, minBallots: true, minBallotsReason: true, status: true, totals: true, ballotCount: true, ballotHash: true, receipts: true, closedAt: true, retainUntil: true, _count: { select: { eligibility: true } }, eligibility: { where: { vote: { status: "OPEN" } }, select: { memberId: true } } },
  });
  return rows.map(({ _count, totals, closedAt, retainUntil, eligibility, ...row }) => ({
    ...row,
    issued: _count.eligibility,
    /** Yalnız açık oylamada: kod verilen üyeler (yoklama gibi; oy içeriği yok). Kapanınca boş. */
    issuedMemberIds: row.status === "OPEN" ? eligibility.map((item) => item.memberId) : [],
    totals: (totals ?? null) as Record<string, number> | null,
    closedAt: closedAt?.toISOString() ?? null,
    retainUntil: retainUntil?.toISOString().slice(0, 10) ?? null,
  }));
}

/** Retention (§9.4): after the period, eligibility and ballots are deleted; totals, receipts and hash stay. */
export async function purgeExpiredVotes(now = new Date()): Promise<number> {
  const db = getDb();
  const expired = await db.meetingVote.findMany({ where: { status: "CLOSED", retainUntil: { lt: now } }, select: { id: true } });
  if (!expired.length) return 0;
  const ids = expired.map((row) => row.id);
  await db.$transaction([
    db.meetingVoteBallot.deleteMany({ where: { voteId: { in: ids } } }),
    db.meetingVoteEligibility.deleteMany({ where: { voteId: { in: ids } } }),
    db.meetingVoteCredential.deleteMany({ where: { voteId: { in: ids } } }),
    db.meetingVote.updateMany({ where: { id: { in: ids } }, data: { retainUntil: null } }),
  ]);
  return ids.length;
}
