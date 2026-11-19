import assert from "node:assert/strict";
import { test } from "node:test";

import { buildTaskBriefing, secretary as tasksSecretary, taskBerlinDay } from "@/modules/tasks/secretary";
import { buildCalendarBriefing, secretary as calendarSecretary } from "@/modules/calendar/secretary";
import { buildMeetingBriefing, secretary as meetingsSecretary } from "@/modules/meetings/secretary";
import { can } from "@/shared/permissions/define";
import { validateBriefingItem, validateModuleSecretary } from "@/shared/secretary/define";
import tasksTr from "@/modules/tasks/messages/tr.json";
import tasksDe from "@/modules/tasks/messages/de.json";
import calendarTr from "@/modules/calendar/messages/tr.json";
import calendarDe from "@/modules/calendar/messages/de.json";
import meetingsTr from "@/modules/meetings/messages/tr.json";
import meetingsDe from "@/modules/meetings/messages/de.json";

function translator(messages: Record<string, unknown>) {
  return (key: string, values: Record<string, string | number> = {}) => {
    const value = key.split(".").reduce<unknown>((obj, part) => (obj as Record<string, unknown> | undefined)?.[part], messages);
    assert.equal(typeof value, "string", `missing translation ${key}`);
    return (value as string).replace(/\{(\w+)\}/g, (whole, field: string) => field in values ? String(values[field]) : whole);
  };
}

test("secretary T1.3: blank snapshots generate no items", () => {
  assert.deepEqual(buildTaskBriefing({ overdue: 0, today: 0 }, { t: translator(tasksTr) }, "2026-11-18"), []);
  assert.deepEqual(buildCalendarBriefing({ today: 0, tomorrow: 0, collisions: 0 }, { t: translator(calendarTr) }, "2026-11-18", "2026-11-19"), []);
  assert.deepEqual(buildMeetingBriefing({ upcoming: 0, noAgenda: 0 }, { t: translator(meetingsTr) }, "2026-11-18"), []);
});

test("secretary T1.3: filled snapshots are contract-valid, translated, module-bound", () => {
  const cases = [
    { name: "tasks", fn: buildTaskBriefing({ overdue: 2, today: 3 }, { t: translator(tasksTr) }, "2026-11-18"), href: "/tasks" },
    { name: "calendar", fn: buildCalendarBriefing({ today: 3, tomorrow: 1, collisions: 1 }, { t: translator(calendarDe) }, "2026-11-18", "2026-11-19"), href: "/calendar" },
    { name: "meetings", fn: buildMeetingBriefing({ upcoming: 2, noAgenda: 1 }, { t: translator(meetingsTr) }, "2026-11-18"), href: "/toplantilar" },
  ];
  for (const entry of cases) {
    assert.ok(entry.fn.length >= 2);
    for (const item of entry.fn) {
      assert.deepEqual(validateBriefingItem(entry.name, item), []);
      assert.ok(item.href.startsWith(entry.href));
      assert.ok(item.title.length > 0);
    }
  }
  for (const [module, messages, count] of [
    ["tasks", tasksDe, 2],
    ["calendar", calendarTr, 3],
    ["meetings", meetingsDe, 2],
  ] as const) {
    const t = translator(messages);
    const item = module === "tasks"
      ? buildTaskBriefing({ overdue: count, today: 0 }, { t }, "2026-11-18")[0]
      : module === "calendar"
        ? buildCalendarBriefing({ today: count, tomorrow: 0, collisions: 0 }, { t }, "2026-11-18", "2026-11-19")[0]
        : buildMeetingBriefing({ upcoming: count, noAgenda: 0 }, { t }, "2026-11-18")[0];
    assert.ok(item.title.includes(String(count)));
  }
});

test("secretary T1.3: module contract / view permissions", () => {
  for (const [module, def, denied] of [
    ["tasks", tasksSecretary, "TEACHER"],
    ["calendar", calendarSecretary, null],
    ["meetings", meetingsSecretary, "TEACHER"],
  ] as const) {
    assert.deepEqual(validateModuleSecretary(module, def), []);
    for (const provider of def.providers) {
      assert.equal(provider.permission.action, "view");
      assert.ok(can("ADMIN", provider.permission.definition, "view"));
      if (denied) assert.equal(can(denied, provider.permission.definition, "view"), false);
    }
  }
});

test("secretary T1.3: Berlin dates handle midnight and DST", () => {
  assert.equal(taskBerlinDay(new Date("2026-11-18T22:59:00Z")), "2026-11-18");
  assert.equal(taskBerlinDay(new Date("2026-11-18T23:01:00Z")), "2026-11-19");
  assert.equal(taskBerlinDay(new Date("2026-03-29T22:01:00Z")), "2026-03-30");
});
