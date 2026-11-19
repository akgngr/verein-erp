import assert from "node:assert/strict";
import { test } from "node:test";

import { preferencesSchema } from "@/modules/secretary/schemas/preferences";
import { createEmailDelivery, renderBriefingEmail, secretaryLink } from "@/modules/secretary/services/briefing-email";
import { runDailyBriefings, type ScheduledPreference } from "@/modules/secretary/services/daily-briefing";
import { getPreferences, type PreferenceRow, type PreferenceStore, savePreferences } from "@/modules/secretary/services/preferences";
import type { Briefing } from "@/shared/secretary/define";

const valid = { briefingEnabled: true, briefingTime: "06:45", quietFrom: "22:00", quietTo: "07:00", channels: ["email", "in_app", "email"] };

test("preferences: şema saat, sessiz saat çifti ve kanalları doğrular", () => {
  const parsed = preferencesSchema.parse(valid);
  assert.deepEqual(parsed.channels, ["email", "in_app"], "tekrarlayan kanal tekilleşir");
  assert.ok(!preferencesSchema.safeParse({ ...valid, briefingTime: "24:00" }).success);
  assert.ok(!preferencesSchema.safeParse({ ...valid, briefingTime: "7:30" }).success);
  assert.ok(!preferencesSchema.safeParse({ ...valid, quietTo: null }).success, "yalnız biri dolu olamaz");
  assert.ok(!preferencesSchema.safeParse({ ...valid, quietTo: "22:00" }).success, "başlangıç = bitiş olamaz");
  assert.ok(preferencesSchema.safeParse({ ...valid, quietFrom: null, quietTo: null }).success);
  assert.ok(!preferencesSchema.safeParse({ ...valid, channels: [] }).success);
  assert.ok(!preferencesSchema.safeParse({ ...valid, channels: ["telegram"] }).success, "Pro kanalı yok");
  // Başka hesap için güncelleme: istemci userId gönderemez (strict şema).
  assert.ok(!preferencesSchema.safeParse({ ...valid, userId: "someone-else" }).success);
});

function memoryStore() {
  const rows = new Map<string, PreferenceRow>();
  const store: PreferenceStore = {
    find: async (userId) => rows.get(userId) ?? null,
    upsert: async (userId, value) => {
      rows.set(userId, { ...value, lastBriefingOn: rows.get(userId)?.lastBriefingOn ?? null });
    },
  };
  return { rows, store };
}

test("preferences: yalnız oturum kullanıcısının kaydı; varsayılanlar; aynı gün işareti korunur", async () => {
  const { rows, store } = memoryStore();
  assert.deepEqual((await getPreferences(store, "u1")).channels, ["in_app"], "kayıt yoksa varsayılan");
  rows.set("u1", { briefingEnabled: true, briefingTime: "07:30", quietFrom: null, quietTo: null, channels: ["email"], lastBriefingOn: "2026-11-19" });
  const meta = await savePreferences(store, "u1", preferencesSchema.parse(valid));
  assert.deepEqual(meta, { briefingEnabled: true, channels: ["email", "in_app"], quietHours: true }, "audit meta saat değeri içermez");
  assert.equal(rows.get("u1")?.lastBriefingOn, "2026-11-19", "saat değişince aynı gün ikinci özet çıkmaz");
  assert.equal(rows.has("u2"), false);
  rows.set("u3", { briefingEnabled: true, briefingTime: "07:30", quietFrom: null, quietTo: null, channels: ["sms"], lastBriefingOn: null });
  assert.deepEqual((await getPreferences(store, "u3")).channels, ["in_app"], "tanınmayan kanal süzülür");
});

const digest = { date: "2026-11-19", total: 4, danger: 1, warning: 2 };

test("email: gövde yalnız sayılar ve uygulama bağlantısı içerir", () => {
  for (const locale of ["tr", "de"] as const) {
    const email = renderBriefingEmail(digest, { locale, url: "https://erp.example.test/sekreter" });
    assert.match(email.subject, /4/);
    assert.match(email.text, /https:\/\/erp\.example\.test\/sekreter/);
    assert.ok(!/\{\w+\}/.test(email.subject + email.text), "doldurulmamış yer tutucu yok");
  }
  assert.equal(secretaryLink("https://erp.example.test/"), "https://erp.example.test/sekreter");
  assert.equal(secretaryLink("https://erp.example.test/alt/yol"), "https://erp.example.test/sekreter");
  assert.equal(secretaryLink(undefined), null);
  assert.equal(secretaryLink("javascript:alert(1)"), null);
  assert.equal(secretaryLink("not a url"), null);
});

test("email: kanal, adres, APP_URL ve mail yapılandırmasına bağlı; hata içeriği taşınmaz", async () => {
  const sent: { to: string; subject: string; text: string; context: { module: string; reference?: string } }[] = [];
  const base = {
    appUrl: "https://erp.example.test",
    locale: "de" as const,
    isMailConfigured: async () => true,
    send: async (message: (typeof sent)[number]) => { sent.push(message); return { ok: true }; },
  };
  const user = { id: "u1", role: "ADMIN" as const, isActive: true, email: "owner@example.test" };

  await createEmailDelivery(base)(user, "in_app", digest);
  await createEmailDelivery(base)({ ...user, email: undefined }, "email", digest);
  await createEmailDelivery({ ...base, appUrl: undefined })(user, "email", digest);
  await createEmailDelivery({ ...base, isMailConfigured: async () => false })(user, "email", digest);
  assert.equal(sent.length, 0);

  await createEmailDelivery(base)(user, "email", digest);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "owner@example.test");
  assert.deepEqual(sent[0].context, { module: "secretary", reference: "daily-briefing:2026-11-19" });
  assert.ok(!sent[0].text.includes("owner@example.test"), "alıcı adresi gövdede yok");

  await assert.rejects(
    () => createEmailDelivery({ ...base, send: async () => ({ ok: false }) })(user, "email", digest),
    (error: unknown) => error instanceof Error && error.message === "SECRETARY_BRIEFING_EMAIL_FAILED",
  );
});

const pref = (overrides: Partial<ScheduledPreference> = {}): ScheduledPreference => ({
  userId: "u1", briefingEnabled: true, briefingTime: "07:30", quietFrom: null, quietTo: null, lastBriefingOn: null, channels: ["email"], ...overrides,
});
const briefingWith = (count: number): Briefing => ({
  generatedAt: "x",
  failures: [],
  sections: count ? [{ module: "tasks", items: Array.from({ length: count }, (_, i) => ({ id: `tasks:due:${i}`, module: "tasks", kind: "due", severity: "info" as const, title: "x", href: "/tasks" })) }] : [],
});

test("daily briefing: boş özet ve sessiz saatte e-posta yok; aynı gün tekrar yok", async () => {
  const delivered: string[] = [];
  const claimed = new Set<string>();
  const deps = (count: number, prefs: ScheduledPreference[]) => ({
    listPreferences: async () => prefs,
    claim: async (userId: string, date: string) => (claimed.has(`${userId}:${date}`) ? false : (claimed.add(`${userId}:${date}`), true)),
    loadUser: async (userId: string) => ({ id: userId, role: "ADMIN" as const, isActive: true, email: `${userId}@example.test` }),
    buildBriefing: async () => briefingWith(count),
    deliver: async (user: { id: string }) => { delivered.push(user.id); },
  });
  const morning = new Date("2026-11-19T07:00:00Z"); // 08:00 Berlin

  await runDailyBriefings(morning, deps(0, [pref({ userId: "empty" })]));
  assert.deepEqual(delivered, [], "boş özet gönderilmez");

  await runDailyBriefings(morning, deps(2, [pref({ userId: "quiet", quietFrom: "07:00", quietTo: "09:00" })]));
  assert.deepEqual(delivered, [], "sessiz saatte gönderilmez");

  await runDailyBriefings(morning, deps(2, [pref({ userId: "ok" })]));
  await runDailyBriefings(morning, deps(2, [pref({ userId: "ok" })]));
  assert.deepEqual(delivered, ["ok"], "aynı gün ikinci kez gönderilmez");
});

test("email: T3.2 şablonu teslimde kullanılır; HTML kaçışlı, yalnız sayılar ve /sekreter bağlantısı", async () => {
  const { dailySummaryRenderer } = await import("@/modules/secretary/services/daily-briefing-runner");
  const sent: { to: string; subject: string; text: string; html?: string }[] = [];
  const deliver = createEmailDelivery({
    appUrl: "https://erp.example.test/",
    locale: "de",
    isMailConfigured: async () => true,
    send: async (message) => { sent.push(message); return { ok: true }; },
    render: dailySummaryRenderer,
  });
  await deliver({ id: "u1", role: "ADMIN", isActive: true, email: "owner@example.test" }, "email", digest);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /https:\/\/erp\.example\.test\/sekreter/);
  assert.ok(sent[0].html?.includes('href="https://erp.example.test/sekreter"'));
  assert.ok(!`${sent[0].text}${sent[0].html}`.includes("owner@example.test"), "alıcı adresi gövdede yok");
  // Üretimde http (localhost dışı) reddedilir; teslim hata verir, runner bu kullanıcıyı atlar.
  const insecure = createEmailDelivery({ appUrl: "http://erp.example.test", locale: "de", isMailConfigured: async () => true, send: async () => ({ ok: true }), render: dailySummaryRenderer });
  await assert.rejects(() => insecure({ id: "u1", role: "ADMIN", isActive: true, email: "owner@example.test" }, "email", digest), /SECRETARY_ORIGIN_REQUIRES_HTTPS/);
});
