// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleCalendar } from "@/shared/calendar/define";

import { calendar as documentsCalendar } from "@/modules/documents/calendar";
import { calendar as meetingsCalendar } from "@/modules/meetings/calendar";
import { calendar as coursesCalendar } from "@/modules/courses/calendar";
import { calendar as crmCalendar } from "@/modules/crm/calendar";
import { calendar as eventsCalendar } from "@/modules/events/calendar";
import { calendar as grantsCalendar } from "@/modules/grants/calendar";
import { calendar as mailingsCalendar } from "@/modules/mailings/calendar";
import { calendar as tasksCalendar } from "@/modules/tasks/calendar";

/** Takvime kayıt sunan modüller (src/modules/<modül>/calendar.ts). */
export const moduleCalendarRegistry: ModuleCalendar[] = [
  documentsCalendar,
  meetingsCalendar,
  coursesCalendar,
  crmCalendar,
  eventsCalendar,
  grantsCalendar,
  mailingsCalendar,
  tasksCalendar,
];
