/**
 * S4.2 (#314) — "benim yerime takip et": izin/geri alma, iptal, DST, yeniden başlatma ve çift çalışma güvenliği,
 * onaysız yan etki yok. Gerçek DB testleri yalnız izole test veritabanında (CI: AI_TEST_DATABASE_URL).
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { buildFollowUpItems } from "@/modules/secretary/secretary";
import { afterReminder, followUpInputSchema, reminderDue, TRANSITIONS, validateDueOn } from "@/modules/secretary/services/follow-up-policy";
import { berlinClock } from "@/modules/secretary/services/schedule";
import { getDb } from "@/shared/db";
import { validateModuleSecretary } from "@/shared/secretary/define";

const valid = { sourceModule: "tasks", sourceHref: "/tasks/bana-atananlar", title: "Teklif dönüşü", dueOn: "2031-03-30", maxReminders: 2 };

test("follow-up: girdi doğrulaması — yalnız uygulama içi kaynak, gerçek tarih, sınırlı tekrar", () => {
  assert.ok(followUpInputSchema.safeParse(valid).success);
  for (const sourceHref of ["https://evil.test", "//evil.test", "/a?next=//x", "/a/../admin", "/a#x", "/a%2f", "tasks"]) {
    assert.equal(followUpInputSchema.safeParse({ ...valid, sourceHref }).success, false, sourceHref);
  }
  assert.equal(followUpInputSchema.safeParse({ ...valid, dueOn: "2031-02-30" }).success, false);
  assert.equal(followUpInputSchema.safeParse({ ...valid, maxReminders: 11 }).success, false);
  assert.equal(followUpInputSchema.safeParse({ ...valid, userId: "someone" }).success, false, "başka kullanıcı adına kayıt yok");
  assert.equal(validateDueOn("2031-03-01", "2031-03-02"), false, "geçmiş tarih yok");
  assert.equal(validateDueOn("2032-03-03", "2031-03-02"), false, "bir yıldan ileri yok");
  assert.equal(validateDueOn("2031-03-02", "2031-03-02"), true);
});

test("follow-up: geçişler, günde bir hatırlatma ve sınırda EXHAUSTED", () => {
  assert.deepEqual(TRANSITIONS.resume.from, ["PAUSED"]);
  assert.ok(!TRANSITIONS.resume.from.includes("CANCELLED"), "iptal/tamamlanan geri açılmaz");
  const row = { status: "ACTIVE" as const, dueOn: "2031-03-30", reminderCount: 0, maxReminders: 2, lastRemindedOn: null };
  assert.equal(reminderDue(row, "2031-03-29"), false, "son tarihten önce yok");
  assert.equal(reminderDue(row, "2031-03-30"), true);
  const first = afterReminder(row, "2031-03-30");
  assert.equal(reminderDue({ ...row, ...first }, "2031-03-30"), false, "aynı gün ikinci kez yok");
  const second = afterReminder({ ...row, ...first }, "2031-03-31");
  assert.equal(second.status, "EXHAUSTED");
  assert.equal(reminderDue({ ...row, ...second }, "2031-04-01"), false);
  assert.equal(reminderDue({ ...row, status: "PAUSED" }, "2031-03-30"), false);
});

test("follow-up: DST — gün Berlin takvimine göre; saat geçişi günü kaydırmaz", () => {
  // 2031-03-30: yaz saatine geçiş (02:00 → 03:00 CEST). 23:30Z bir önceki gün Berlin'de gece yarısını geçmiştir.
  assert.equal(berlinClock(new Date("2031-03-29T23:30:00Z")).date, "2031-03-30");
  assert.equal(berlinClock(new Date("2031-03-30T21:59:00Z")).date, "2031-03-30");
  assert.equal(berlinClock(new Date("2031-03-30T22:00:00Z")).date, "2031-03-31");
  // Ekim: kış saatine dönüş; 22:59Z hâlâ aynı gün (CET +1).
  assert.equal(berlinClock(new Date("2031-10-26T22:59:00Z")).date, "2031-10-26");
});

test("follow-up: özet öğesi kaynağa gider, yalnız sahibinin başlığı", () => {
  const t = (key: string, values?: Record<string, string | number>) => `${key}:${values?.title ?? ""}`;
  const items = buildFollowUpItems([{ id: "f1", title: "x".repeat(300), sourceModule: "tasks", sourceHref: "/tasks", dueOn: "2031-03-29", status: "ACTIVE", reminderCount: 1, maxReminders: 3, lastRemindedOn: null, pausedReason: null }], { t }, "2031-03-30");
  assert.equal(items[0].id, "secretary:follow-up:f1");
  assert.equal(items[0].href, "/tasks");
  assert.equal(items[0].severity, "warning");
  assert.ok(items[0].title.length < 160);
});

test("follow-up: sekreter sözleşmesi geçerli", async () => {
  const { secretary } = await import("@/modules/secretary/secretary");
  assert.deepEqual(validateModuleSecretary("secretary", secretary), []);
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: yalıtım, geçişler, yeniden başlatma/çift çalışma, sessiz saat, yetki geri alma", { skip: !enabled }, async () => {
  const db = getDb();
  const tag = `fu-${randomUUID().slice(0, 8)}`;
  const svc = await import("@/modules/secretary/services/follow-ups");
  const mk = (role: "ADMIN" | "VIEWER") => db.user.create({ data: { name: tag, email: `${randomUUID()}@${tag}.example.test`, passwordHash: "x", role, isActive: true } });
  const owner = await mk("ADMIN");
  const other = await mk("ADMIN");
  const users = new Map([[owner.id, { id: owner.id, role: "ADMIN" as const, isActive: true }], [other.id, { id: other.id, role: "ADMIN" as const, isActive: true }]]);
  let quiet: { quietFrom: string | null; quietTo: string | null } | null = null;
  const deps = { loadUser: async (id: string) => users.get(id) ?? null, loadQuietHours: async () => quiet };
  const day1 = new Date("2031-03-30T08:00:00Z"); // 10:00 Berlin, DST günü
  const create = (dueOn = "2031-03-30") => svc.createFollowUp(owner.id, { ...valid, dueOn }, new Date("2031-03-01T08:00:00Z"));
  const state = (id: string) => db.secretaryFollowUp.findUniqueOrThrow({ where: { id } });
  try {
    const a = await create();
    assert.equal((await db.secretaryFollowUp.findUniqueOrThrow({ where: { id: a.id } })).titleEnc.includes("Teklif"), false, "başlık şifreli");
    assert.deepEqual((await svc.listFollowUps(other.id)).map((row) => row.id), [], "başka kullanıcının kaydı görünmez");
    await assert.rejects(() => svc.transitionFollowUp({ id: other.id, role: "ADMIN" }, a.id, "cancel"), /notFound/);

    // Çift çalışma (eşzamanlı) ve yeniden başlatma: aynı gün tek hatırlatma.
    await Promise.all([svc.runFollowUpReminders(day1, deps), svc.runFollowUpReminders(day1, deps)]);
    await svc.runFollowUpReminders(new Date("2031-03-30T20:00:00Z"), deps);
    assert.equal((await state(a.id)).reminderCount, 1);
    assert.equal((await state(a.id)).lastRemindedOn, "2031-03-30");

    // Sessiz saat: ertesi gün 07:30 Berlin sessizken hatırlatma yok, 10:00'da var → sınır 2 → EXHAUSTED.
    quiet = { quietFrom: "22:00", quietTo: "09:00" };
    await svc.runFollowUpReminders(new Date("2031-03-31T05:30:00Z"), deps);
    assert.equal((await state(a.id)).reminderCount, 1);
    await svc.runFollowUpReminders(new Date("2031-03-31T08:00:00Z"), deps);
    assert.equal((await state(a.id)).status, "EXHAUSTED");
    await svc.runFollowUpReminders(new Date("2031-04-01T08:00:00Z"), deps);
    assert.equal((await state(a.id)).reminderCount, 2, "sınırdan sonra hatırlatma yok");
    quiet = null;

    // Duraklat/devam/iptal: iptal edilen hatırlatılmaz, yeniden açılmaz.
    const b = await create("2031-04-02");
    assert.equal(await svc.transitionFollowUp({ id: owner.id, role: "ADMIN" }, b.id, "pause"), "PAUSED");
    await svc.runFollowUpReminders(new Date("2031-04-02T08:00:00Z"), deps);
    assert.equal((await state(b.id)).reminderCount, 0, "duraklatılan hatırlatılmaz");
    assert.equal(await svc.transitionFollowUp({ id: owner.id, role: "ADMIN" }, b.id, "resume"), "ACTIVE");
    assert.equal(await svc.transitionFollowUp({ id: owner.id, role: "ADMIN" }, b.id, "cancel"), "CANCELLED");
    await assert.rejects(() => svc.transitionFollowUp({ id: owner.id, role: "ADMIN" }, b.id, "resume"), /invalidTransition/);
    await svc.runFollowUpReminders(new Date("2031-04-02T08:00:00Z"), deps);
    assert.equal((await state(b.id)).reminderCount, 0);

    // Yetki geri alma: rol yetkisizse otomatik duraklatılır; yetkisiz kullanıcı devam ettiremez.
    const c = await create("2031-04-03");
    users.set(owner.id, { id: owner.id, role: "VIEWER" as never, isActive: true });
    await svc.runFollowUpReminders(new Date("2031-04-03T08:00:00Z"), deps);
    const paused = await state(c.id);
    assert.equal(paused.status, "PAUSED");
    assert.equal(paused.pausedReason, "permission");
    assert.equal(paused.reminderCount, 0);
    await assert.rejects(() => svc.transitionFollowUp({ id: owner.id, role: "VIEWER" }, c.id, "resume"), /forbidden/);

    // Hiçbir kaynak kayıt değişmedi, dış mesaj yok: servis yalnız secretary_follow_ups'a yazar.
    assert.equal(await db.secretaryFollowUp.count({ where: { userId: other.id } }), 0);
  } finally {
    await db.secretaryFollowUp.deleteMany({ where: { userId: { in: [owner.id, other.id] } } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
  }
});
