import "server-only";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { secretaryPermissions } from "../permissions";
import {
  afterReminder,
  FOLLOW_UP_LIMITS,
  type FollowUpCommand,
  type FollowUpInput,
  type FollowUpStatus,
  reminderDue,
  TRANSITIONS,
  validateDueOn,
} from "./follow-up-policy";
import { berlinClock, isQuietTime } from "./schedule";

const PURPOSE = "secretary-follow-up";

export class FollowUpError extends Error {}

/** Son kullanıcının gördüğü güvenli projeksiyon (şifreli alan/başka kullanıcı yok). */
export type FollowUpView = {
  id: string;
  title: string;
  sourceModule: string;
  sourceHref: string;
  dueOn: string;
  status: FollowUpStatus;
  reminderCount: number;
  maxReminders: number;
  lastRemindedOn: string | null;
  pausedReason: string | null;
};

const SELECT = {
  id: true, userId: true, sourceModule: true, sourceHref: true, titleEnc: true, dueOn: true, status: true,
  reminderCount: true, maxReminders: true, lastRemindedOn: true, pausedReason: true,
} as const;

type Row = { id: string; sourceModule: string; sourceHref: string; titleEnc: string; dueOn: string; status: FollowUpStatus; reminderCount: number; maxReminders: number; lastRemindedOn: string | null; pausedReason: string | null };

function view(row: Row): FollowUpView {
  return {
    id: row.id,
    title: openSecret(PURPOSE, row.titleEnc) ?? "",
    sourceModule: row.sourceModule,
    sourceHref: row.sourceHref,
    dueOn: row.dueOn,
    status: row.status,
    reminderCount: row.reminderCount,
    maxReminders: row.maxReminders,
    lastRemindedOn: row.lastRemindedOn,
    pausedReason: row.pausedReason,
  };
}

export async function createFollowUp(userId: string, input: FollowUpInput, now = new Date()): Promise<FollowUpView> {
  if (!validateDueOn(input.dueOn, berlinClock(now).date)) throw new FollowUpError("secretary.followUps.errors.dateInvalid");
  const db = getDb();
  const active = await db.secretaryFollowUp.count({ where: { userId, status: { in: ["ACTIVE", "PAUSED"] } } });
  if (active >= FOLLOW_UP_LIMITS.maxActivePerUser) throw new FollowUpError("secretary.followUps.errors.limit");
  const row = await db.secretaryFollowUp.create({
    data: { userId, sourceModule: input.sourceModule, sourceHref: input.sourceHref, titleEnc: sealSecret(PURPOSE, input.title), dueOn: input.dueOn, maxReminders: input.maxReminders },
    select: SELECT,
  });
  return view(row);
}

export async function listFollowUps(userId: string, statuses: readonly FollowUpStatus[] = ["ACTIVE", "PAUSED", "EXHAUSTED"]): Promise<FollowUpView[]> {
  const rows = await getDb().secretaryFollowUp.findMany({ where: { userId, status: { in: [...statuses] } }, orderBy: [{ dueOn: "asc" }, { createdAt: "asc" }], take: 200, select: SELECT });
  return rows.map(view);
}

/**
 * Durum geçişi (duraklat/devam/iptal/tamamla). Yalnız sahibi; atomik koşullu güncelleme.
 * Başkasının kaydı "yok" sayılır. Devam ettirirken yetki yeniden denetlenir.
 */
export async function transitionFollowUp(user: { id: string; role: Role }, id: string, command: FollowUpCommand): Promise<FollowUpStatus> {
  const rule = TRANSITIONS[command];
  if (command === "resume" && !can(user.role, secretaryPermissions, "view")) throw new FollowUpError("secretary.followUps.errors.forbidden");
  const result = await getDb().secretaryFollowUp.updateMany({
    where: { id, userId: user.id, status: { in: [...rule.from] } },
    data: { status: rule.to, pausedReason: rule.to === "PAUSED" ? "user" : null },
  });
  if (result.count !== 1) {
    const exists = await getDb().secretaryFollowUp.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    throw new FollowUpError(exists ? "secretary.followUps.errors.invalidTransition" : "secretary.followUps.errors.notFound");
  }
  return rule.to;
}

export type ReminderRunDeps = {
  loadUser: (userId: string) => Promise<{ id: string; role: Role; isActive: boolean } | null>;
  loadQuietHours: (userId: string) => Promise<{ quietFrom: string | null; quietTo: string | null } | null>;
};

export type ReminderRunResult = { checked: number; reminded: number; paused: number; quiet: number; skipped: number };

/**
 * Zamanlanmış hatırlatma (pg-boss, 15 dk). Yalnız durum ilerletir: hatırlatma sekreter özetinde görünür;
 * dış mesaj gönderilmez, kaynak değiştirilmez. Atomik claim: yeniden başlatma veya çift çalışmada aynı gün
 * ikinci hatırlatma olmaz. Yetkisi kalkan/pasif kullanıcının takibi "permission" nedeniyle duraklatılır.
 */
export async function runFollowUpReminders(now: Date, deps: ReminderRunDeps): Promise<ReminderRunResult> {
  const db = getDb();
  const clock = berlinClock(now);
  const result: ReminderRunResult = { checked: 0, reminded: 0, paused: 0, quiet: 0, skipped: 0 };
  const rows = await db.secretaryFollowUp.findMany({
    where: { status: "ACTIVE", dueOn: { lte: clock.date }, OR: [{ lastRemindedOn: null }, { lastRemindedOn: { not: clock.date } }] },
    orderBy: { dueOn: "asc" },
    take: 500,
    select: { ...SELECT, userId: true },
  });
  for (const row of rows) {
    result.checked += 1;
    if (!reminderDue(row, clock.date)) { result.skipped += 1; continue; }
    try {
      const user = await deps.loadUser(row.userId);
      if (!user?.isActive || !can(user.role, secretaryPermissions, "view")) {
        const paused = await db.secretaryFollowUp.updateMany({ where: { id: row.id, status: "ACTIVE" }, data: { status: "PAUSED", pausedReason: "permission" } });
        result.paused += paused.count;
        continue;
      }
      const quiet = await deps.loadQuietHours(row.userId);
      if (quiet && isQuietTime(clock.minutes, quiet.quietFrom, quiet.quietTo)) { result.quiet += 1; continue; }
      const next = afterReminder(row, clock.date);
      const claimed = await db.secretaryFollowUp.updateMany({
        where: { id: row.id, status: "ACTIVE", reminderCount: row.reminderCount, OR: [{ lastRemindedOn: null }, { lastRemindedOn: { not: clock.date } }] },
        data: next,
      });
      if (claimed.count === 1) result.reminded += 1;
      else result.skipped += 1;
    } catch {
      // Bir kaydın hatası diğerlerini durdurmaz; günlükte içerik yok.
      console.error("[secretary] FOLLOW_UP_REMINDER_FAILED");
      result.skipped += 1;
    }
  }
  return result;
}

/** Bugün hatırlatılan veya süresi geçmiş takipler (sekreter özeti için; yalnız sahibi). */
export async function dueFollowUpsFor(userId: string, now: Date): Promise<FollowUpView[]> {
  const today = berlinClock(now).date;
  const rows = await getDb().secretaryFollowUp.findMany({
    where: { userId, status: { in: ["ACTIVE", "EXHAUSTED"] }, dueOn: { lte: today } },
    orderBy: { dueOn: "asc" },
    take: 20,
    select: SELECT,
  });
  return rows.map(view);
}
