import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, test } from "node:test";

import type { PrismaClient } from "@prisma/client";

import { ballotListHash, hashBallotCode, newBallotCode } from "@/modules/meetings/lib/secret-ballot";
import { AI_TOOL_POLICY, DATA_POLICY } from "@/shared/data-policy";

process.env.DATABASE_URL ??= "postgresql://unused/never-connected";
process.env.AUTH_SECRET ??= "test-secret-ballot-auth-secret-0123456789";

const read = (path: string) => fs.readFileSync(path, "utf8");
const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };
const schema = read("src/modules/meetings/schema.prisma");
const model = (name: string) => {
  const body = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1];
  assert.ok(body, `${name} must exist`);
  return body;
};

type Credential = { credentialHash: string; voteId: string; weight: number; spent: boolean };
type Ballot = { id: string; voteId: string; choice: string; weight: number; batch: number; ballotNonce: string };

function fixture(count = 50) {
  const issued = Array.from({ length: count }, (_, index) => ({ memberId: `synthetic-${index}`, code: newBallotCode(), choice: index % 2 ? "no" : "yes" }));
  const state = {
    credentials: issued.map(({ code }) => ({ credentialHash: hashBallotCode(code), voteId: "vote-a", weight: 1, spent: false })) as Credential[],
    ballots: [] as Ballot[],
    eligibility: issued.map(({ memberId }) => ({ voteId: "vote-a", memberId, usedAt: new Date("2026-11-23T10:15:00Z") as Date | null })),
    vote: { id: "vote-a", status: "OPEN", options: ["yes", "no", "abstain"], minBallots: 5, meetingId: "meeting-a", agendaItemId: null, question: "Synthetic question", meeting: { meetingDate: new Date("2026-11-23T00:00:00Z") }, retainUntil: null as Date | null, totals: null as Record<string, number> | null, ballotHash: null as string | null, receipts: [] as string[] },
    decisions: [] as unknown[],
    egress: [] as unknown[],
  };
  const db = {
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
      deleteMany: async () => { const countDeleted = state.credentials.length; state.credentials = []; return { count: countDeleted }; },
    },
    meetingVoteBallot: {
      create: async ({ data }: { data: Ballot }) => { state.ballots.push(data); return data; },
      createMany: async ({ data }: { data: Ballot[] }) => { state.ballots.push(...data); return { count: data.length }; },
      findMany: async () => state.ballots.map(({ choice, weight, ballotNonce }) => ({ choice, weight, ballotNonce })),
      deleteMany: async () => { const countDeleted = state.ballots.length; state.ballots = []; return { count: countDeleted }; },
    },
    meetingVoteEligibility: {
      updateMany: async ({ data }: { data: { usedAt: null } }) => { for (const item of state.eligibility) item.usedAt = data.usedAt; return { count: state.eligibility.length }; },
      deleteMany: async () => { const countDeleted = state.eligibility.length; state.eligibility = []; return { count: countDeleted }; },
    },
    meetingVote: {
      findUnique: async () => state.vote,
      findMany: async ({ where }: { where: { status: string; retainUntil: { lt: Date } } }) => state.vote.status === where.status && state.vote.retainUntil && state.vote.retainUntil < where.retainUntil.lt ? [{ id: state.vote.id }] : [],
      update: async ({ data }: { data: Partial<typeof state.vote> }) => { Object.assign(state.vote, data); return state.vote; },
      updateMany: async ({ data }: { data: { retainUntil: null } }) => { state.vote.retainUntil = data.retainUntil; return { count: 1 }; },
    },
    meetingCounter: { upsert: async () => ({ lastSeq: 1 }) },
    meetingDecision: { create: async ({ data }: { data: unknown }) => { state.decisions.push(data); return data; } },
    systemEgressLedger: { create: async ({ data }: { data: unknown }) => { state.egress.push(data); return data; } },
    $transaction: async (operation: unknown) => typeof operation === "function" ? (operation as (tx: unknown) => unknown)(db) : Promise.all(operation as Promise<unknown>[]),
  };
  return { issued, state, db: db as unknown as PrismaClient };
}

async function withDb<T>(db: PrismaClient, operation: () => Promise<T>): Promise<T> {
  const previous = prismaGlobal.prisma;
  prismaGlobal.prisma = db;
  try { return await operation(); } finally { prismaGlobal.prisma = previous; }
}

function spearman(left: readonly number[], right: readonly number[]): number {
  assert.equal(left.length, right.length);
  const ranks = (values: readonly number[]) => {
    const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
    const output = Array<number>(values.length);
    sorted.forEach((item, index) => { output[item.index] = index; });
    return output;
  };
  const a = ranks(left);
  const b = ranks(right);
  const sum = a.reduce((total, rank, index) => total + (rank - b[index]) ** 2, 0);
  return 1 - (6 * sum) / (left.length * (left.length ** 2 - 1));
}

describe("RFC-004 §5 / §9 secret-ballot privacy", () => {
  test("both schemas have an exact allowlist and neither can relate to Member or carry time/session/IP", () => {
    for (const [name, allowed] of [
      ["MeetingVoteBallot", ["id", "voteId", "vote", "choice", "weight", "batch", "ballotNonce"]],
      ["MeetingVoteCredential", ["credentialHash", "voteId", "vote", "weight", "spent"]],
    ] as const) {
      const body = model(name);
      const fields = body.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("//") && !line.startsWith("@@")).map((line) => line.split(/\s+/)[0]);
      assert.deepEqual(fields.sort(), [...allowed].sort(), `${name} gained a linkable column`);
      assert.doesNotMatch(body, /\bMember\b|memberId|DateTime|autoincrement|cuid\(|@default\(now\(|session|\bip\b|userAgent/i);
    }
    assert.doesNotMatch(model("MeetingVoteBallot"), /credentialHash/i);
  });

  test("50 synthetic casts cannot be sorted or joined to issue order by stored ballot columns", async () => {
    const { castBallot, closeVote } = await import("@/modules/meetings/services/secret-ballot");
    for (let run = 0; run < 8; run++) {
      const { issued, state, db } = fixture();
      await withDb(db, async () => {
        const receipts: string[] = [];
        for (const { code, choice } of issued) {
          const result = await castBallot(code, choice);
          assert.equal(result.ok, true);
          if (result.ok) receipts.push(result.receipt);
        }
        assert.equal((await closeVote("vote-a", null)).ok, true);
        const ballotRows = state.ballots;
        assert.equal(ballotRows.length, 50);
        assert.equal(new Set(ballotRows.map((row) => row.id)).size, 50);
        const columns = ["id", "ballotNonce"] as const;
        for (const column of columns) {
          const order = ballotRows.map((row) => receipts.indexOf(row.ballotNonce));
          const encoded = ballotRows.map((row) => parseInt(row[column].replace(/-/g, "").slice(0, 8), 32));
          assert.ok(Math.abs(spearman(order, encoded)) < 0.55, `${column} correlated with issue order`);
        }
        assert.ok(Math.abs(spearman(state.vote.receipts.map((receipt) => receipts.indexOf(receipt)), Array.from({ length: 50 }, (_, index) => index))) < 0.55, "published receipt order correlated with issue order");
        assert.ok(ballotRows.every((row) => Object.keys(row).sort().join(",") === "ballotNonce,batch,choice,id,voteId,weight"));
        assert.ok(state.credentials.length === 0, "credential-to-ballot join expires at close");
      });
    }
  });

  test("one credential under concurrent casts creates one ballot; spent and missing codes match", async () => {
    const { castBallot } = await import("@/modules/meetings/services/secret-ballot");
    const { issued, state, db } = fixture(1);
    await withDb(db, async () => {
      const results = await Promise.all([castBallot(issued[0].code, "yes"), castBallot(issued[0].code, "no")]);
      assert.equal(results.filter((result) => result.ok).length, 1);
      assert.equal(state.ballots.length, 1);
      assert.deepEqual(await castBallot(issued[0].code, "yes"), await castBallot(newBallotCode(), "yes"));
    });
  });

  test("public route is session-independent and cannot read cookies, IP or session helpers", async () => {
    const action = read("src/modules/meetings/actions/public-vote-actions.ts");
    const booth = read("src/modules/meetings/public/oy/page.tsx");
    assert.doesNotMatch(action + booth, /from\s+["'][^"']*(?:auth|session|cookies|headers)[^"']*["']|\bcookies\(|\bheaders\(|getSessionUser|requireUser|x-forwarded/i);
    const { castBallotAction } = await import("@/modules/meetings/actions/public-vote-actions");
    for (const cookie of [undefined, "admin-session", "portal-session"]) {
      const { issued, db } = fixture(1);
      const previous = process.env.TEST_SYNTHETIC_COOKIE;
      if (cookie) process.env.TEST_SYNTHETIC_COOKIE = cookie;
      else delete process.env.TEST_SYNTHETIC_COOKIE;
      try {
        await withDb(db, async () => assert.equal((await castBallotAction({ code: issued[0].code, choice: "yes" })).ok, true));
      } finally {
        if (previous === undefined) delete process.env.TEST_SYNTHETIC_COOKIE;
        else process.env.TEST_SYNTHETIC_COOKIE = previous;
      }
    }
  });

  test("casting logs no identifiers and produces zero fetch/egress calls", async () => {
    const { castBallotAction } = await import("@/modules/meetings/actions/public-vote-actions");
    const { issued, state, db } = fixture(1);
    const logs: string[] = [];
    const original = { log: console.log, info: console.info, warn: console.warn, error: console.error, fetch: globalThis.fetch };
    let outbound = 0;
    console.log = console.info = console.warn = console.error = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); };
    globalThis.fetch = async () => { outbound++; throw new Error("external request from vote path"); };
    try {
      await withDb(db, async () => assert.equal((await castBallotAction({ code: issued[0].code, choice: "yes" })).ok, true));
    } finally {
      console.log = original.log; console.info = original.info; console.warn = original.warn; console.error = original.error; globalThis.fetch = original.fetch;
    }
    assert.equal(outbound, 0);
    assert.deepEqual(state.egress, []);
    assert.doesNotMatch(logs.join("\n"), new RegExp(`${issued[0].memberId}|${issued[0].code}|198\\.51\\.100\\.42|SyntheticAgent`, "i"));
    assert.doesNotMatch(read("src/modules/meetings/services/secret-ballot.ts") + read("src/modules/meetings/actions/public-vote-actions.ts"), /console\.|recordEgress|systemEgressLedger|channelFetch|syncFetch/);
  });

  test("receipt list omits choices; canonical hash detects tampering without disclosing a receipt's choice", async () => {
    const { castBallot, closeVote } = await import("@/modules/meetings/services/secret-ballot");
    const { issued, state, db } = fixture(6);
    await withDb(db, async () => {
      const receipts: string[] = [];
      for (const { code, choice } of issued) {
        const result = await castBallot(code, choice);
        assert.equal(result.ok, true);
        if (result.ok) receipts.push(result.receipt);
      }
      const close = await closeVote("vote-a", null);
      assert.equal(close.ok, true);
      if (!close.ok) throw new Error("synthetic vote did not close");
      assert.equal(close.published, true);
      assert.deepEqual([...state.vote.receipts].sort(), [...receipts].sort());
      assert.ok(state.vote.receipts.every((receipt) => typeof receipt === "string" && /^([0-9A-HJKMNP-TV-Z]{4}-){3}[0-9A-HJKMNP-TV-Z]{4}$/.test(receipt)));
      assert.equal(state.vote.ballotHash, ballotListHash(state.ballots));
      assert.notEqual(state.vote.ballotHash, ballotListHash([{ ...state.ballots[0], choice: "abstain" }, ...state.ballots.slice(1)]));
      assert.equal(JSON.stringify(state.vote.receipts).includes("choice"), false);
    });
  });

  test("close nulls usedAt and removes credentials; purge waits for retention date and preserves proof", async () => {
    const { castBallot, closeVote, purgeExpiredVotes } = await import("@/modules/meetings/services/secret-ballot");
    const { issued, state, db } = fixture(5);
    await withDb(db, async () => {
      for (const { code, choice } of issued) assert.equal((await castBallot(code, choice)).ok, true);
      assert.equal((await closeVote("vote-a", null)).ok, true);
      assert.equal(state.credentials.length, 0);
      assert.ok(state.eligibility.every((row) => row.usedAt === null));
      const { totals, ballotHash, receipts, retainUntil } = state.vote;
      assert.ok(retainUntil);
      assert.equal(await purgeExpiredVotes(new Date(retainUntil.getTime() - 1)), 0);
      assert.equal(state.ballots.length, 5);
      assert.equal(await purgeExpiredVotes(new Date(retainUntil.getTime() + 1)), 1);
      assert.equal(state.ballots.length, 0);
      assert.equal(state.eligibility.length, 0);
      assert.deepEqual(state.vote.totals, totals);
      assert.equal(state.vote.ballotHash, ballotHash);
      assert.deepEqual(state.vote.receipts, receipts);
    });
  });

  test("K0 tables are absent from AI sources and no module may use them as an AI tool", () => {
    for (const table of ["MeetingVoteBallot", "MeetingVoteCredential"] as const) assert.equal(DATA_POLICY[table].category, "K0");
    assert.doesNotMatch(JSON.stringify(AI_TOOL_POLICY), /MeetingVote(?:Ballot|Credential)/);
    const aiFiles = fs.readdirSync("src/modules/ai", { recursive: true }).filter((name): name is string => typeof name === "string" && /\.(ts|tsx)$/.test(name));
    for (const path of aiFiles) assert.doesNotMatch(read(`src/modules/ai/${path}`), /MeetingVote(?:Ballot|Credential)/, path);
  });
});
