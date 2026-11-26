import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, test } from "node:test";

import type { PrismaClient } from "@prisma/client";

import { hashBallotCode, newBallotCode } from "@/modules/meetings/lib/secret-ballot";

process.env.DATABASE_URL ??= "postgresql://unused/never-connected";
process.env.AUTH_SECRET ??= "test-f5-meetings-auth-secret-0123456789";

const read = (path: string) => fs.readFileSync(path, "utf8");
const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };

async function withDb<T>(db: PrismaClient, operation: () => Promise<T>): Promise<T> {
  const previous = prismaGlobal.prisma;
  prismaGlobal.prisma = db;
  try {
    return await operation();
  } finally {
    prismaGlobal.prisma = previous;
  }
}

describe("Pre-Live F5 (#579) — Secret ballot closeVote race & meeting guards", () => {
  test("closeVote atomically claims OPEN -> CLOSED before reading ballots, preventing ballot loss and double-close", async () => {
    const { castBallot, closeVote } = await import("@/modules/meetings/services/secret-ballot");

    type Credential = { credentialHash: string; voteId: string; weight: number; spent: boolean };
    type Ballot = { id: string; voteId: string; choice: string; weight: number; batch: number; ballotNonce: string };

    const codes = Array.from({ length: 6 }, () => newBallotCode());
    const state = {
      credentials: codes.map((code) => ({ credentialHash: hashBallotCode(code), voteId: "vote-race", weight: 1, spent: false })) as Credential[],
      ballots: [] as Ballot[],
      eligibility: codes.map((_, idx) => ({ voteId: "vote-race", memberId: `m-${idx}`, usedAt: new Date() as Date | null })),
      vote: {
        id: "vote-race",
        status: "OPEN" as "OPEN" | "CLOSED",
        options: ["yes", "no", "abstain"],
        minBallots: 5,
        meetingId: "meeting-race",
        agendaItemId: null,
        question: "Approve budget?",
        meeting: { meetingDate: new Date("2026-11-23T00:00:00Z") },
        retainUntil: null as Date | null,
        totals: null as Record<string, number> | null,
        ballotHash: null as string | null,
        receipts: [] as string[],
      },
      decisions: [] as unknown[],
      txCallLog: [] as string[],
    };

    const createTxProxy = (insideTx: boolean) => ({
      meetingVoteCredential: {
        findUnique: async ({ where }: { where: { credentialHash: string } }) => {
          const item = state.credentials.find((row) => row.credentialHash === where.credentialHash);
          return item ? { ...item, vote: { status: state.vote.status, options: state.vote.options } } : null;
        },
        updateMany: async ({ where }: { where: { credentialHash: string; spent: boolean } }) => {
          const item = state.credentials.find((row) => row.credentialHash === where.credentialHash && row.spent === where.spent);
          if (!item) return { count: 0 };
          item.spent = true;
          return { count: 1 };
        },
        deleteMany: async () => {
          assert.equal(insideTx, true, "credential deletion must run inside $transaction");
          state.txCallLog.push("deleteCredentials");
          const count = state.credentials.length;
          state.credentials = [];
          return { count };
        },
      },
      meetingVoteBallot: {
        create: async ({ data }: { data: Ballot }) => {
          state.ballots.push(data);
          return data;
        },
        createMany: async ({ data }: { data: Ballot[] }) => {
          assert.equal(insideTx, true, "ballot rewrite must run inside $transaction");
          state.txCallLog.push("createBallots");
          state.ballots.push(...data);
          return { count: data.length };
        },
        findMany: async () => {
          assert.equal(insideTx, true, "ballots MUST be read inside $transaction after vote status lock");
          state.txCallLog.push("readBallots");
          return state.ballots.map(({ choice, weight, ballotNonce }) => ({ choice, weight, ballotNonce }));
        },
        deleteMany: async () => {
          assert.equal(insideTx, true, "ballot deletion must run inside $transaction");
          state.txCallLog.push("deleteBallots");
          const count = state.ballots.length;
          state.ballots = [];
          return { count };
        },
      },
      meetingVoteEligibility: {
        updateMany: async ({ data }: { data: { usedAt: null } }) => {
          for (const row of state.eligibility) row.usedAt = data.usedAt;
          return { count: state.eligibility.length };
        },
      },
      meetingVote: {
        findUnique: async () => {
          assert.equal(insideTx, true, "vote lookup in closeVote must run inside $transaction");
          return { ...state.vote };
        },
        updateMany: async ({ where, data }: { where: { id: string; status: string }; data: { status: "CLOSED" } }) => {
          assert.equal(insideTx, true, "OPEN -> CLOSED claim must run inside $transaction");
          state.txCallLog.push("claimClosed");
          if (state.vote.status !== where.status) return { count: 0 };
          state.vote.status = data.status;
          return { count: 1 };
        },
        update: async ({ data }: { data: Partial<typeof state.vote> }) => {
          Object.assign(state.vote, data);
          return state.vote;
        },
      },
      meetingCounter: { upsert: async () => ({ lastSeq: 1 }) },
      meetingDecision: { create: async ({ data }: { data: unknown }) => { state.decisions.push(data); return data; } },
      $transaction: async <T>(op: (tx: unknown) => Promise<T>) => op(createTxProxy(true)),
    });

    const db = createTxProxy(false) as unknown as PrismaClient;

    await withDb(db, async () => {
      // Cast 5 ballots before close
      for (let idx = 0; idx < 5; idx += 1) {
        const cast = await castBallot(codes[idx], idx < 3 ? "yes" : "no");
        assert.equal(cast.ok, true);
      }

      // Trigger two concurrent closeVote calls + one concurrent castBallot
      const [close1, close2, concurrentCast] = await Promise.all([
        closeVote("vote-race", null),
        closeVote("vote-race", null),
        castBallot(codes[5], "yes"),
      ]);

      // Exactly one closeVote wins; the second returns voteNotOpen
      const closeResults = [close1, close2];
      assert.equal(closeResults.filter((res) => res.ok).length, 1);
      assert.equal(closeResults.filter((res) => !res.ok && res.error === "voteNotOpen").length, 1);

      // Zero-loss invariant: if the concurrent cast succeeded, its receipt MUST be in the closed tally and ballot box
      const expectedTotal = concurrentCast.ok ? 6 : 5;
      assert.equal(state.ballots.length, expectedTotal);
      assert.equal(state.vote.receipts.length, expectedTotal);
      if (concurrentCast.ok) {
        assert.ok(state.vote.receipts.includes(concurrentCast.receipt), "concurrently accepted ballot must never be silently lost");
        assert.deepEqual(state.vote.totals, { yes: 4, no: 2, abstain: 0 });
      } else {
        assert.deepEqual(state.vote.totals, { yes: 3, no: 2, abstain: 0 });
      }
      assert.equal(state.decisions.length, 1);

      // Any cast attempt after closeVote completes MUST fail with invalidCode
      const afterCloseCast = await castBallot(newBallotCode(), "yes");
      assert.deepEqual(afterCloseCast, { ok: false, error: "invalidCode" });

      // Verify exact transaction ordering: claimClosed -> deleteCredentials -> readBallots -> deleteBallots -> createBallots
      assert.ok(state.txCallLog.indexOf("claimClosed") >= 0);
      assert.ok(state.txCallLog.indexOf("claimClosed") < state.txCallLog.indexOf("deleteCredentials"));
      assert.ok(state.txCallLog.indexOf("deleteCredentials") < state.txCallLog.indexOf("readBallots"));
      assert.ok(state.txCallLog.indexOf("readBallots") < state.txCallLog.indexOf("deleteBallots"));
      assert.ok(state.txCallLog.indexOf("deleteBallots") < state.txCallLog.indexOf("createBallots"));
    });
  });

  test("vote-actions.ts enforces assertMeetingEditable on issueBallotAction and closeVoteAction", () => {
    const src = read("src/modules/meetings/actions/vote-actions.ts");
    const editableCalls = src.match(/assertMeetingEditable\(/g) ?? [];
    assert.ok(editableCalls.length >= 3, "openVoteAction, issueBallotAction, and closeVoteAction must all enforce assertMeetingEditable");
  });

  test("change-status.ts blocks APPROVED transition when secret votes remain OPEN", () => {
    const src = read("src/modules/meetings/actions/change-status.ts");
    assert.match(src, /meetingVote\.count\(\{\s*where:\s*\{\s*meetingId:\s*meeting\.id,\s*status:\s*"OPEN"\s*\},?\s*\}\)/);
    assert.match(src, /meetings\.errors\.approveHasOpenVotes/);
  });

  test("action-item-actions.ts uses i18n keys instead of hardcoded Turkish and votes-tab.tsx uses ConfirmDialog", () => {
    const actionItems = read("src/modules/meetings/actions/action-item-actions.ts");
    assert.doesNotMatch(actionItems, /Geçerli bir karar seçin/);
    assert.match(actionItems, /meetings\.validation\.decisionRequired/);

    const votesTab = read("src/modules/meetings/components/votes-tab.tsx");
    assert.doesNotMatch(votesTab, /window\.confirm/);
    assert.match(votesTab, /<ConfirmDialog\b/);
  });
});
