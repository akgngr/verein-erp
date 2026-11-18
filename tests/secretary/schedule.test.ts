import assert from "node:assert/strict";
import { test } from "node:test";

import { runDailyBriefings, type ScheduledPreference } from "@/modules/secretary/services/daily-briefing";
import { berlinClock, dueBriefingDate, isQuietTime, parseClock } from "@/modules/secretary/services/schedule";
import type { Briefing } from "@/shared/secretary/define";

const pref = (overrides: Partial<ScheduledPreference> = {}): ScheduledPreference => ({
  userId: "u1",
  briefingEnabled: true,
  briefingTime: "07:30",
  quietFrom: null,
  quietTo: null,
  lastBriefingOn: null,
  channels: ["email"],
  ...overrides,
});

test("schedule: saat ayrıştırma ve sessiz saat (gece yarısını aşan dahil)", () => {
  assert.equal(parseClock("07:30"), 450);
  assert.equal(parseClock("24:00"), null);
  assert.equal(parseClock("7:30"), null);
  assert.equal(isQuietTime(23 * 60, "22:00", "07:00"), true);
  assert.equal(isQuietTime(6 * 60 + 59, "22:00", "07:00"), true);
  assert.equal(isQuietTime(7 * 60, "22:00", "07:00"), false);
  assert.equal(isQuietTime(13 * 60, "12:00", "14:00"), true);
  assert.equal(isQuietTime(13 * 60, null, "14:00"), false);
  assert.equal(isQuietTime(13 * 60, "12:00", "12:00"), false);
});

test("schedule: yaz/kış saati — 07:30 Berlin her iki dönemde doğru UTC anında", () => {
  // Kış (CET, UTC+1): 06:30Z = 07:30 yerel.
  assert.deepEqual(berlinClock(new Date("2026-01-15T06:29:00Z")), { date: "2026-01-15", minutes: 449 });
  assert.equal(dueBriefingDate(pref(), new Date("2026-01-15T06:29:00Z")), null);
  assert.equal(dueBriefingDate(pref(), new Date("2026-01-15T06:30:00Z")), "2026-01-15");
  // Yaz (CEST, UTC+2): 05:30Z = 07:30 yerel.
  assert.equal(dueBriefingDate(pref(), new Date("2026-07-15T05:29:00Z")), null);
  assert.equal(dueBriefingDate(pref(), new Date("2026-07-15T05:30:00Z")), "2026-07-15");
  // Geçiş günleri: 29.03.2026 (02:00→03:00) ve 25.10.2026 (03:00→02:00).
  assert.equal(dueBriefingDate(pref({ briefingTime: "02:30" }), new Date("2026-03-29T01:00:00Z")), "2026-03-29"); // yerel 03:00
  assert.equal(dueBriefingDate(pref(), new Date("2026-03-29T05:30:00Z")), "2026-03-29");
  assert.equal(dueBriefingDate(pref(), new Date("2026-10-25T06:29:00Z")), null);
  assert.equal(dueBriefingDate(pref(), new Date("2026-10-25T06:30:00Z")), "2026-10-25");
  // Gece yarısı sınırı: 23:30Z kışın ertesi günün 00:30'u.
  assert.equal(berlinClock(new Date("2026-12-31T23:30:00Z")).date, "2027-01-01");
});

test("schedule: kapalı, sessiz saat ve aynı gün tekrarı yok", () => {
  const at = new Date("2026-11-18T07:00:00Z"); // 08:00 yerel
  assert.equal(dueBriefingDate(pref({ briefingEnabled: false }), at), null);
  assert.equal(dueBriefingDate(pref({ lastBriefingOn: "2026-11-18" }), at), null);
  assert.equal(dueBriefingDate(pref({ lastBriefingOn: "2026-11-17" }), at), "2026-11-18");
  assert.equal(dueBriefingDate(pref({ quietFrom: "07:00", quietTo: "09:00" }), at), null);
  // Sessiz saat bitince aynı gün telafi edilir.
  assert.equal(dueBriefingDate(pref({ quietFrom: "07:00", quietTo: "09:00" }), new Date("2026-11-18T08:00:00Z")), "2026-11-18");
  assert.equal(dueBriefingDate(pref({ briefingTime: "bozuk" }), at), null);
});

function briefing(severities: ("info" | "warning" | "danger")[]): Briefing {
  return {
    generatedAt: "2026-11-18T07:00:00.000Z",
    failures: [],
    sections: [{ module: "tasks", items: severities.map((severity, index) => ({ id: `tasks:due:${index}`, module: "tasks", kind: "due", severity, title: "x", href: "/tasks" })) }],
  };
}

test("daily briefing: idempotent sahiplenme, çalışma anında yetki denetimi, hata izolasyonu", async () => {
  const now = new Date("2026-11-18T07:00:00Z");
  const claimed = new Set<string>();
  const delivered: { userId: string; channel: string; total: number; danger: number }[] = [];
  const users: Record<string, { id: string; role: "ADMIN" | "VIEWER"; isActive: boolean }> = {
    u1: { id: "u1", role: "ADMIN", isActive: true },
    u2: { id: "u2", role: "VIEWER", isActive: true }, // sekreter yetkisi yok
    u3: { id: "u3", role: "ADMIN", isActive: false }, // pasif
    u5: { id: "u5", role: "ADMIN", isActive: true }, // özet hatası
  };
  const deps = {
    listPreferences: async () => [
      pref({ userId: "u1" }),
      pref({ userId: "u2" }),
      pref({ userId: "u3" }),
      pref({ userId: "u4", channels: ["in_app"] }),
      pref({ userId: "u5" }),
      pref({ userId: "u6", briefingTime: "09:00" }),
    ],
    claim: async (userId: string, date: string) => {
      const key = `${userId}:${date}`;
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    },
    loadUser: async (userId: string) => users[userId] ?? null,
    buildBriefing: async (user: { id: string }) => {
      if (user.id === "u5") throw new Error("boom");
      return briefing(["danger", "warning", "info"]);
    },
    deliver: async (user: { id: string }, channel: string, digest: { total: number; danger: number }) => {
      delivered.push({ userId: user.id, channel, total: digest.total, danger: digest.danger });
    },
  };

  const first = await runDailyBriefings(now, deps);
  assert.deepEqual(first, { checked: 6, due: 5, produced: 1, skipped: 3 });
  assert.deepEqual(delivered, [{ userId: "u1", channel: "email", total: 3, danger: 1 }]);
  assert.ok(claimed.has("u4:2026-11-18")); // yalnız uygulama içi: gün işaretlenir, dış teslim yok

  // Aynı gün ikinci çalışma (paralel worker dahil): hiçbir şey tekrar teslim edilmez.
  const second = await runDailyBriefings(now, deps);
  assert.equal(second.produced, 0);
  assert.equal(delivered.length, 1);
});
