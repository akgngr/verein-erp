/**
 * S4.2 (#314) — "benim yerime takip et" saf kuralları. Tarih Europe/Berlin takvim günüdür ("YYYY-MM-DD");
 * böylece yaz/kış saati geçişi hatırlatma gününü kaydırmaz. Hatırlatma günde en çok bir kez, toplamda
 * `maxReminders` kez; sonra EXHAUSTED (kayıt kalır, hatırlatma durur).
 */
import { z } from "zod";

export const FOLLOW_UP_STATUSES = ["ACTIVE", "PAUSED", "DONE", "CANCELLED", "EXHAUSTED"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];
export const FOLLOW_UP_LIMITS = { maxActivePerUser: 100, maxReminders: 10, maxDaysAhead: 366 } as const;

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const isRealDay = (value: string) => DAY.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** Kaynak: sahibi olan modül + o modülün yetkili sayfası (uygulama içi göreli yol; parametre/dış adres yok). */
export function isSafeSourceHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length < 2 || href.length > 300) return false;
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  if (/[\\?#%<>\s\x00-\x1f]/.test(href)) return false;
  return !href.split("/").some((segment) => segment === "." || segment === "..");
}

export const followUpInputSchema = z.object({
  sourceModule: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
  sourceHref: z.string().refine(isSafeSourceHref, "FOLLOW_UP_SOURCE_INVALID"),
  title: z.string().trim().min(1).max(200),
  dueOn: z.string().refine(isRealDay, "FOLLOW_UP_DATE_INVALID"),
  maxReminders: z.number().int().min(1).max(FOLLOW_UP_LIMITS.maxReminders).default(3),
}).strict();
export type FollowUpInput = z.infer<typeof followUpInputSchema>;

/** Son tarih bugünden (Berlin) önce olamaz ve en fazla bir yıl ilerisi olabilir. */
export function validateDueOn(dueOn: string, today: string): boolean {
  if (!isRealDay(dueOn) || dueOn < today) return false;
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + FOLLOW_UP_LIMITS.maxDaysAhead);
  return dueOn <= limit.toISOString().slice(0, 10);
}

export type FollowUpCommand = "pause" | "resume" | "cancel" | "complete";

/** İzinli geçişler; diğerleri reddedilir (DONE/CANCELLED sondur). */
export const TRANSITIONS: Record<FollowUpCommand, { from: readonly FollowUpStatus[]; to: FollowUpStatus }> = {
  pause: { from: ["ACTIVE"], to: "PAUSED" },
  resume: { from: ["PAUSED"], to: "ACTIVE" },
  cancel: { from: ["ACTIVE", "PAUSED", "EXHAUSTED"], to: "CANCELLED" },
  complete: { from: ["ACTIVE", "PAUSED", "EXHAUSTED"], to: "DONE" },
};

export type ReminderState = { status: FollowUpStatus; dueOn: string; reminderCount: number; maxReminders: number; lastRemindedOn: string | null };

/** Bu Berlin gününde hatırlatma yapılmalı mı? */
export function reminderDue(row: ReminderState, today: string): boolean {
  return row.status === "ACTIVE" && row.dueOn <= today && row.reminderCount < row.maxReminders && row.lastRemindedOn !== today;
}

/** Hatırlatma sonrası durum: sınıra ulaşınca EXHAUSTED. */
export function afterReminder(row: ReminderState, today: string): Pick<ReminderState, "reminderCount" | "lastRemindedOn" | "status"> {
  const reminderCount = row.reminderCount + 1;
  return { reminderCount, lastRemindedOn: today, status: reminderCount >= row.maxReminders ? "EXHAUSTED" : "ACTIVE" };
}
