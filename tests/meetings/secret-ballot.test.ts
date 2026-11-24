import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, test } from "node:test";

import type { PrismaClient } from "@prisma/client";

import { ballotListHash, hashBallotCode, isBallotCodeShape, minutePrecision, newBallotCode, newReceiptCode, normalizeBallotCode, shuffled, tally, validateMinBallots, yesNoResult } from "@/modules/meetings/lib/secret-ballot";
import { DATA_POLICY } from "@/shared/data-policy";

// RFC-004 phase 3 (#522). Synthetic data only.
process.env.DATABASE_URL ??= "postgresql://unused/never-connected";
process.env.AUTH_SECRET ??= "test-secret-ballot-auth-secret-0123456789";
const globals = globalThis as unknown as { prisma?: PrismaClient };
const read = (file: string) => fs.readFileSync(file, "utf8");

describe("secret ballot primitives", () => {
  test("codes are random, typeable and normalised before hashing", () => {
    const codes = new Set(Array.from({ length: 200 }, () => newBallotCode()));
    assert.equal(codes.size, 200);
    const code = [...codes][0];
    assert.match(code, /^([0-9A-HJKMNP-TV-Z]{5}-){5}[0-9A-HJKMNP-TV-Z]$/);
    assert.equal(isBallotCodeShape(normalizeBallotCode(code)), true);
    assert.equal(hashBallotCode(code.toLowerCase().replace(/-/g, " ")), hashBallotCode(code));
    assert.equal(normalizeBallotCode("ab-cd oi l"), "ABCD011");
    assert.match(newReceiptCode(), /^([0-9A-HJKMNP-TV-Z]{4}-){3}[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  test("tally, list hash (order independent) and yes/no result", () => {
    const ballots = [{ choice: "yes", weight: 1, ballotNonce: "A" }, { choice: "no", weight: 1, ballotNonce: "B" }, { choice: "yes", weight: 2, ballotNonce: "C" }];
    assert.deepEqual(tally(["yes", "no", "abstain"], ballots), { yes: 3, no: 1, abstain: 0 });
    assert.equal(ballotListHash(ballots), ballotListHash([...ballots].reverse()), "insertion order must not matter");
    assert.notEqual(ballotListHash(ballots), ballotListHash([...ballots.slice(1), { choice: "no", weight: 1, ballotNonce: "A" }]));
    assert.equal(yesNoResult(["yes", "no", "abstain"], { yes: 3, no: 1, abstain: 0 }), "ACCEPTED");
    assert.equal(yesNoResult(["yes", "no", "abstain"], { yes: 1, no: 1, abstain: 5 }), "REJECTED", "a tie is not accepted");
    assert.equal(yesNoResult(["Ada", "Ben"], { Ada: 3, Ben: 1 }), null, "candidate lists are recorded by hand");
  });

  test("minBallots: default 5, never below 3, a reason below 5", () => {
    assert.equal(validateMinBallots(5, null), "ok");
    assert.equal(validateMinBallots(4, null), "reasonRequired");
    assert.equal(validateMinBallots(3, "small board"), "ok");
    assert.equal(validateMinBallots(2, "x"), "tooLow");
  });

  test("shuffle is a permutation; usedAt has minute precision", () => {
    const items = Array.from({ length: 50 }, (_, index) => index);
    assert.deepEqual([...shuffled(items)].sort((a, b) => a - b), items);
    assert.equal(minutePrecision(new Date("2026-11-23T20:15:42.123Z")).toISOString(), "2026-11-23T20:15:00.000Z");
  });
});

describe("secret ballot unlinkability guards (RFC-004 §2.2)", () => {
  const schema = read("src/modules/meetings/schema.prisma");
  const block = (name: string) => schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
  const fields = (name: string) => block(name).split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("//") && !line.startsWith("///") && !line.startsWith("@@")).map((line) => line.split(/\s+/)[0]);

  test("the ballot box has only allowlisted columns: no member, time, order, session or IP", () => {
    assert.deepEqual(fields("MeetingVoteBallot").sort(), ["ballotNonce", "batch", "choice", "id", "vote", "voteId", "weight"].sort());
    assert.doesNotMatch(block("MeetingVoteBallot"), /DateTime|autoincrement|cuid\(\)|now\(\)|memberId|credential|session|ip\b/i);
  });

  test("the credential table holds no member and no time", () => {
    assert.deepEqual(fields("MeetingVoteCredential").sort(), ["credentialHash", "spent", "vote", "voteId", "weight"].sort());
    assert.doesNotMatch(block("MeetingVoteCredential"), /DateTime|memberId/);
  });

  test("ballot and credential tables are K0 (no AI tool, no export)", () => {
    assert.equal(DATA_POLICY.MeetingVoteBallot.category, "K0");
    assert.equal(DATA_POLICY.MeetingVoteCredential.category, "K0");
  });

  test("the public booth never reads a session, cookie, header or IP", () => {
    const publicActions = read("src/modules/meetings/actions/public-vote-actions.ts");
    assert.doesNotMatch(publicActions, /auth|session|cookies\(|headers\(|requireUser|getSessionUser|x-forwarded/i);
    const service = read("src/modules/meetings/services/secret-ballot.ts");
    const cast = service.slice(service.indexOf("export async function castBallot"), service.indexOf("export async function closeVote"));
    assert.doesNotMatch(cast, /memberId|headers|cookies|console\./);
    assert.match(read("src/proxy.ts"), /formular\/\|oy\$\|oy\//, "the booth route is excluded from the auth middleware");
  });
});

describe("cast and close with a fake database", () => {
  type Credential = { credentialHash: string; voteId: string; weight: number; spent: boolean };
  type Ballot = { id: string; voteId: string; choice: string; weight: number; batch: number; ballotNonce: string };
  function fakeDb(options: string[], minBallots = 5) {
    const state = { credentials: [] as Credential[], ballots: [] as Ballot[], eligibility: [{ voteId: "v1", memberId: "m1", usedAt: new Date() as Date | null }], vote: { id: "v1", status: "OPEN", options, minBallots, meetingId: "mt", agendaItemId: null, question: "Q?", meeting: { meetingDate: new Date("2026-11-23T00:00:00Z") } } as Record<string, unknown>, decisions: [] as unknown[] };
    const db = {
      meetingVoteCredential: {
        findUnique: async ({ where }: { where: { credentialHash: string } }) => {
          const row = state.credentials.find((item) => item.credentialHash === where.credentialHash);
          return row ? { ...row, vote: { status: state.vote.status, options: state.vote.options, question: state.vote.question } } : null;
        },
        updateMany: async ({ where }: { where: { credentialHash: string; spent: boolean } }) => {
          const row = state.credentials.find((item) => item.credentialHash === where.credentialHash && item.spent === where.spent);
          if (!row) return { count: 0 };
          row.spent = true;
          return { count: 1 };
        },
        deleteMany: async () => { const count = state.credentials.length; state.credentials = []; return { count }; },
      },
      meetingVoteBallot: {
        create: async ({ data }: { data: Ballot }) => { state.ballots.push(data); return data; },
        createMany: async ({ data }: { data: Ballot[] }) => { state.ballots.push(...data); return { count: data.length }; },
        findMany: async () => state.ballots.map(({ choice, weight, ballotNonce }) => ({ choice, weight, ballotNonce })),
        deleteMany: async () => { const count = state.ballots.length; state.ballots = []; return { count }; },
      },
      meetingVoteEligibility: { updateMany: async ({ data }: { data: { usedAt: null } }) => { for (const row of state.eligibility) row.usedAt = data.usedAt; return { count: state.eligibility.length }; } },
      meetingVote: {
        findUnique: async () => state.vote,
        update: async ({ data }: { data: Record<string, unknown> }) => { Object.assign(state.vote, data); return state.vote; },
      },
      meetingCounter: { upsert: async () => ({ lastSeq: 7 }) },
      meetingDecision: { create: async ({ data }: { data: unknown }) => { state.decisions.push(data); return data; } },
      $transaction: async (arg: unknown) => (typeof arg === "function" ? (arg as (tx: unknown) => unknown)(db) : Promise.all(arg as Promise<unknown>[])),
    };
    return { db: db as unknown as PrismaClient, state };
  }

  test("a code is single use, also under concurrency; unknown and spent codes look the same", async () => {
    const { castBallot } = await import("@/modules/meetings/services/secret-ballot");
    const { db, state } = fakeDb(["yes", "no", "abstain"]);
    const previous = globals.prisma;
    globals.prisma = db;
    try {
      const code = newBallotCode();
      state.credentials.push({ credentialHash: hashBallotCode(code), voteId: "v1", weight: 1, spent: false });
      assert.deepEqual(await castBallot(code, "maybe"), { ok: false, error: "invalidChoice" });
      const [first, second] = await Promise.all([castBallot(code, "yes"), castBallot(code, "no")]);
      assert.equal([first, second].filter((result) => result.ok).length, 1, "exactly one ballot");
      assert.equal(state.ballots.length, 1);
      assert.deepEqual(await castBallot(code, "yes"), { ok: false, error: "invalidCode" });
      assert.deepEqual(await castBallot(newBallotCode(), "yes"), { ok: false, error: "invalidCode" });
      assert.equal(Object.keys(state.ballots[0]).sort().join(","), "ballotNonce,batch,choice,id,voteId,weight");
    } finally {
      globals.prisma = previous;
    }
  });

  test("close below minBallots withholds totals, deletes credentials, nulls usedAt, publishes receipts", async () => {
    const { castBallot, closeVote } = await import("@/modules/meetings/services/secret-ballot");
    const { db, state } = fakeDb(["yes", "no", "abstain"], 5);
    const previous = globals.prisma;
    globals.prisma = db;
    try {
      const receipts: string[] = [];
      for (const choice of ["yes", "no", "yes"]) {
        const code = newBallotCode();
        state.credentials.push({ credentialHash: hashBallotCode(code), voteId: "v1", weight: 1, spent: false });
        const result = await castBallot(code, choice);
        if (result.ok) receipts.push(result.receipt);
      }
      state.credentials.push({ credentialHash: "unused", voteId: "v1", weight: 1, spent: false });
      const before = state.ballots.map((ballot) => ballot.id);
      const result = await closeVote("v1", null);
      assert.deepEqual(result, { ok: true, published: false, ballotCount: 3 });
      assert.equal(state.vote.status, "CLOSED");
      assert.equal(state.vote.totals, undefined, "totals withheld below minBallots");
      assert.equal(state.credentials.length, 0, "all credentials deleted");
      assert.equal(state.eligibility[0].usedAt, null);
      assert.deepEqual([...(state.vote.receipts as string[])].sort(), [...receipts].sort());
      assert.equal(state.ballots.length, 3);
      assert.ok(state.ballots.every((ballot) => !before.includes(ballot.id)), "ballots are re-written with fresh ids");
      assert.equal(state.vote.ballotHash, ballotListHash(state.ballots));
      assert.equal(state.decisions.length, 0);
    } finally {
      globals.prisma = previous;
    }
  });

  test("a published yes/no/abstain vote creates the meeting decision", async () => {
    const { castBallot, closeVote } = await import("@/modules/meetings/services/secret-ballot");
    const { db, state } = fakeDb(["yes", "no", "abstain"], 3);
    const previous = globals.prisma;
    globals.prisma = db;
    try {
      for (const choice of ["yes", "yes", "no", "abstain"]) {
        const code = newBallotCode();
        state.credentials.push({ credentialHash: hashBallotCode(code), voteId: "v1", weight: 1, spent: false });
        await castBallot(code, choice);
      }
      const result = await closeVote("v1", null);
      assert.deepEqual(result, { ok: true, published: true, ballotCount: 4 });
      assert.deepEqual(state.vote.totals, { yes: 2, no: 1, abstain: 1 });
      assert.equal(state.decisions.length, 1);
      assert.match(JSON.stringify(state.decisions[0]), /"result":"ACCEPTED".*"votesFor":2,"votesAgainst":1,"votesAbstain":1/);
    } finally {
      globals.prisma = previous;
    }
  });
});
