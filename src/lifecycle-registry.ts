// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleLifecycle } from "@/shared/modules/lifecycle";

import { lifecycle as systemLifecycle } from "@/modules/system/lifecycle";
import { lifecycle as authLifecycle } from "@/modules/auth/lifecycle";
import { lifecycle as aiLifecycle } from "@/modules/ai/lifecycle";
import { lifecycle as calendarLifecycle } from "@/modules/calendar/lifecycle";
import { lifecycle as crmLifecycle } from "@/modules/crm/lifecycle";
import { lifecycle as demoLifecycle } from "@/modules/demo/lifecycle";
import { lifecycle as exportsLifecycle } from "@/modules/exports/lifecycle";
import { lifecycle as mailLifecycle } from "@/modules/mail/lifecycle";
import { lifecycle as notificationsLifecycle } from "@/modules/notifications/lifecycle";
import { lifecycle as secretaryLifecycle } from "@/modules/secretary/lifecycle";
import { lifecycle as widgetsLifecycle } from "@/modules/widgets/lifecycle";
import { lifecycle as youthprotectionLifecycle } from "@/modules/youth-protection/lifecycle";

/** Modül yaşam döngüsü kancaları (src/modules/<modül>/lifecycle.ts), ör. kapatılırken temizlik. */
export const moduleLifecycleRegistry: ModuleLifecycle[] = [
  systemLifecycle,
  authLifecycle,
  aiLifecycle,
  calendarLifecycle,
  crmLifecycle,
  demoLifecycle,
  exportsLifecycle,
  mailLifecycle,
  notificationsLifecycle,
  secretaryLifecycle,
  widgetsLifecycle,
  youthprotectionLifecycle,
];
