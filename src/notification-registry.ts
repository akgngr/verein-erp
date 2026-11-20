// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleNotifications } from "@/shared/notifications/define";

import { notifications as meetingsNotifications } from "@/modules/meetings/notifications";
import { notifications as mailNotifications } from "@/modules/mail/notifications";
import { notifications as secretaryNotifications } from "@/modules/secretary/notifications";
import { notifications as tasksNotifications } from "@/modules/tasks/notifications";

/** Merkezi bildirim türleri (src/modules/<modül>/notifications.ts, ADR 0006). */
export const moduleNotificationRegistry: ModuleNotifications[] = [
  meetingsNotifications,
  mailNotifications,
  secretaryNotifications,
  tasksNotifications,
];
