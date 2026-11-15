import "server-only";

import { z } from "zod";

import { aiToolV2 } from "@/shared/ai/v2";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { memberPaymentsPermissions, membersPermissions } from "../permissions";
import { listMemberDues } from "../queries/get-member-dues";

const MAX_MATCHES = 10;
const ALIAS = /^\[\[K\d{1,6}\]\]$/;

const dueRow = z.object({ year: z.number().int(), status: z.string(), remainingEur: z.number().int(), overdue: z.boolean() }).strict();
const profile = z.object({
  person: z.string(),
  status: z.string(),
  membershipType: z.string(),
  memberSinceYear: z.number().int(),
  exitYear: z.number().int().nullable(),
  dues: z.array(dueRow).nullable(),
  overdueEur: z.number().int().nullable(),
}).strict();
const output = z.object({ matches: z.number().int(), truncated: z.boolean(), people: z.array(profile) }).strict();

export const MEMBER_PROFILE_AI_FIELDS = [
  "matches", "truncated", "people", "people.person", "people.status", "people.membershipType", "people.memberSinceYear", "people.exitYear",
  "people.dues", "people.dues.year", "people.dues.status", "people.dues.remainingEur", "people.dues.overdue", "people.overdueEur",
] as const;

/**
 * Takma adlı üye profili (modelDataClass: pseudonymous; docs/architecture/ai-cloud-pseudonym-relay.md).
 * Arama: kullanıcının yazdığı ad parçası ya da konuşmadaki takma ad ([[K3]]). Model kişiyi yalnız [[Kn]]
 * olarak görür; ad, üye no, iletişim, adres, doğum tarihi, kimlik no, IBAN, notlar ASLA dönmez.
 * Tarihler yıl düzeyinde, tutarlar tam avro. Aidat ayrıntısı yalnız aidat görme yetkisi olana.
 * Yanıttaki [[Kn]] gösterimde izleyicinin canlı yetkisiyle gerçek ada çevrilir.
 */
export const memberProfileAiTool = aiToolV2({
  name: "get_member_profile",
  operation: "read",
  allowed: (user) => can(user.role, membersPermissions, "view"),
  description:
    "Look up members by a name fragment the user typed (e.g. a first name) or by an alias like [[K3]] already in this conversation. Returns up to 10 people as aliases ([[Kn]]) with status, membership type, member-since year, exit year and (if permitted) dues per year in whole euros. Never returns names, contact data, addresses, birth dates or IDs; refer to people only by their alias — the user sees the real name.", // i18n-ignore (model-facing)
  input: z.object({
    person: z.string().regex(ALIAS).optional().describe("Alias from this conversation, e.g. [[K3]]"),
    name: z.string().trim().min(2).max(60).optional().describe("Name fragment exactly as the user wrote it"),
  }).strict(),
  result: output,
  modelOutput: output,
  policy: { purpose: "member-lookup", serverReads: ["Member", "MemberDue", "MemberPayment"], modelFields: [...MEMBER_PROFILE_AI_FIELDS], processing: "approved_provider", modelDataClass: "pseudonymous" },
  limits: { maxRows: MAX_MATCHES * 5 },
  projectForModel: (result) => result,
  run: async ({ person, name }, context) => {
    if (!context.pseudonym || !context.resolvePseudonym) throw new Error("AI_PSEUDONYM_UNAVAILABLE");
    if (!person && !name) return { matches: 0, truncated: false, people: [] };
    const db = getDb();
    const select = { id: true, status: true, type: true, joinDate: true, exitDate: true } as const;
    let rows: Array<{ id: string; status: string; type: string; joinDate: Date; exitDate: Date | null }>;
    let matches: number;
    if (person) {
      const id = await context.resolvePseudonym("members", person).catch(() => null);
      const row = id ? await db.member.findFirst({ where: { id, deletedAt: null }, select }) : null;
      rows = row ? [row] : [];
      matches = rows.length;
    } else {
      const words = name!.split(/\s+/).filter(Boolean).slice(0, 3);
      const where = { deletedAt: null, AND: words.map((word) => ({ OR: [{ firstName: { contains: word, mode: "insensitive" as const } }, { lastName: { contains: word, mode: "insensitive" as const } }] })) };
      [rows, matches] = await Promise.all([db.member.findMany({ where, select, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: MAX_MATCHES }), db.member.count({ where })]);
    }
    context.signal.throwIfAborted();
    const showDues = can(context.user.role, memberPaymentsPermissions, "view");
    const people = [];
    for (const row of rows) {
      const dues = showDues ? (await listMemberDues(row.id)).slice(0, 5) : null;
      people.push({
        person: await context.pseudonym("members", row.id),
        status: row.status,
        membershipType: row.type,
        memberSinceYear: row.joinDate.getUTCFullYear(),
        exitYear: row.exitDate ? row.exitDate.getUTCFullYear() : null,
        dues: dues ? dues.map((due) => ({ year: due.year, status: due.status, remainingEur: Math.round(due.remainingCents / 100), overdue: due.overdue })) : null,
        overdueEur: dues ? Math.round(dues.filter((due) => due.overdue).reduce((sum, due) => sum + due.remainingCents, 0) / 100) : null,
      });
    }
    return { matches, truncated: matches > rows.length, people };
  },
});
