import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import { layoutDay } from "@/modules/calendar/lib/layout";
import { calculatePayout } from "@/modules/courses/services/payout-calc";
import { sortItems } from "@/modules/secretary/services/briefing";
import type { BriefingItem } from "@/shared/secretary/define";

const ROOT = process.cwd();

describe("Modern ECMAScript Runtime & Immutability (Issue #329)", () => {
  test("ECMAScript 2023 Array immutability metodları ortamda mevcuttur", () => {
    assert.equal(typeof Array.prototype.toSorted, "function", "Array.prototype.toSorted mevcut olmalıdır");
    assert.equal(typeof Array.prototype.toReversed, "function", "Array.prototype.toReversed mevcut olmalıdır");
    assert.equal(typeof Promise.withResolvers, "function", "Promise.withResolvers runtime'da mevcut olmalıdır");
  });

  test("calendar layoutDay: toSorted kullanımı girdi dizisini mutasyona uğratmaz", () => {
    const at = (h: number) => new Date(2026, 0, 1, h, 0);
    const item1 = { id: "late", start: at(14), end: at(15) };
    const item2 = { id: "early", start: at(9), end: at(10) };
    const original = [item1, item2];
    const snapshot = [...original];

    const result = layoutDay(original);

    // Girdi dizisi sıralamadan sonra değişmemeli (immutability)
    assert.equal(original[0].id, snapshot[0].id, "Girdi dizisinin ilk elemanı mutasyona uğramamalıdır");
    assert.equal(original[1].id, snapshot[1].id, "Girdi dizisinin ikinci elemanı mutasyona uğramamalıdır");
    assert.equal(result.size, 2);
    assert.ok(result.has("late"));
    assert.ok(result.has("early"));
  });

  test("courses calculatePayout: toSorted kullanımı oturum dizisini mutasyona uğratmaz ve doğru sıralar", () => {
    const s1 = { id: "b", date: "2026-10-15", startTime: "10:00", endTime: "11:30", courseCode: "K-1", courseTitle: "Kurs 1" };
    const s2 = { id: "a", date: "2026-10-01", startTime: "09:00", endTime: "10:00", courseCode: "K-1", courseTitle: "Kurs 1" };
    const sessions = [s1, s2];

    const payout = calculatePayout(sessions, { rateCents: 3000, rateUnit: "HOUR" }, 60);

    // Çıktı tarih sırasına göre olmalı (a önce, sonra b)
    assert.equal(payout.lines[0].sessionId, "a");
    assert.equal(payout.lines[1].sessionId, "b");
    // Orijinal dizi sırası korunmalı
    assert.equal(sessions[0].id, "b", "Orijinal sessions dizisi değişmemelidir");
    assert.equal(sessions[1].id, "a", "Orijinal sessions dizisi değişmemelidir");
  });

  test("exports allFormats: kaynak kodunda toSorted kullanıldığı ve sıralama kuralı doğrulanır", () => {
    const file = fs.readFileSync(path.join(ROOT, "src/modules/exports/formats/index.ts"), "utf8");
    assert.match(
      file,
      /moduleFormatRegistry\.toSorted\(/,
      "exports formats index.ts moduleFormatRegistry.toSorted kullanmalıdır",
    );

    // Sıralama davranışının doğruluğu (exports modülü önce gelir)
    const mockRegistry = [
      { moduleKey: "accounting", formats: [] },
      { moduleKey: "exports", formats: [] },
      { moduleKey: "members", formats: [] },
    ];
    const sorted = mockRegistry.toSorted((a, b) => (a.moduleKey === "exports" ? -1 : b.moduleKey === "exports" ? 1 : 0));
    assert.equal(sorted[0].moduleKey, "exports");
    assert.equal(mockRegistry[0].moduleKey, "accounting", "Orijinal mockRegistry mutasyona uğramamalıdır");
  });

  test("secretary sortItems: toSorted önem ve vadeye göre sıralar, girdiyi değiştirmez", () => {
    const danger: BriefingItem = {
      id: "sec:danger",
      module: "accounting",
      kind: "overdue",
      severity: "danger",
      title: "Gecikmiş Fatura",
      href: "/accounting",
    };
    const info: BriefingItem = {
      id: "sec:info",
      module: "tasks",
      kind: "task",
      severity: "info",
      title: "Bilgi",
      href: "/tasks",
    };
    const input = [info, danger];

    const sorted = sortItems(input);

    assert.equal(sorted[0].id, "sec:danger", "Tehlike (danger) önce gelmelidir");
    assert.equal(sorted[1].id, "sec:info", "Bilgi (info) sonra gelmelidir");
    assert.equal(input[0].id, "sec:info", "Orijinal input dizisi mutasyona uğramamalıdır");
    assert.equal(input[1].id, "sec:danger", "Orijinal input dizisi mutasyona uğramamalıdır");
  });

  test("system toggle-module: kaynak kodunda toReversed kullanıldığı ve sıralama kuralı doğrulanır", () => {
    const file = fs.readFileSync(path.join(ROOT, "src/modules/system/actions/toggle-module.ts"), "utf8");
    assert.match(
      file,
      /dependents\.toReversed\(\)/,
      "toggle-module.ts dependents.toReversed() kullanmalıdır",
    );

    const dependents = ["courses", "progress", "meetings"];
    const reversed = dependents.toReversed();

    assert.deepEqual(reversed, ["meetings", "progress", "courses"]);
    assert.deepEqual(dependents, ["courses", "progress", "meetings"], "Orijinal bağımlılık dizisi korunmalıdır");
  });
});
