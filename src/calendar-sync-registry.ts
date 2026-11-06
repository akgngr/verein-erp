// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleCalendarSync } from "@/shared/calendar/sync";

import { calendarSync as calendarappleCalendarSync } from "@/modules/calendar-apple/calendar-sync";
import { calendarSync as calendargoogleCalendarSync } from "@/modules/calendar-google/calendar-sync";
import { calendarSync as calendaroutlookCalendarSync } from "@/modules/calendar-outlook/calendar-sync";

/** Takvim senkron eklentileri (src/modules/<modül>/calendar-sync.ts). */
export const moduleCalendarSyncRegistry: ModuleCalendarSync[] = [
  calendarappleCalendarSync,
  calendargoogleCalendarSync,
  calendaroutlookCalendarSync,
];
