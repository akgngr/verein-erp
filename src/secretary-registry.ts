// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleSecretary } from "@/shared/secretary/define";

import { secretary as documentsSecretary } from "@/modules/documents/secretary";
import { secretary as meetingsSecretary } from "@/modules/meetings/secretary";
import { secretary as membersSecretary } from "@/modules/members/secretary";
import { secretary as accountingSecretary } from "@/modules/accounting/secretary";
import { secretary as calendarSecretary } from "@/modules/calendar/secretary";
import { secretary as secretarySecretary } from "@/modules/secretary/secretary";
import { secretary as tasksSecretary } from "@/modules/tasks/secretary";

/** Kişisel sekretere sabah özeti katkısı veren modüller (src/modules/<modül>/secretary.ts). */
export const moduleSecretaryRegistry: ModuleSecretary[] = [
  documentsSecretary,
  meetingsSecretary,
  membersSecretary,
  accountingSecretary,
  calendarSecretary,
  secretarySecretary,
  tasksSecretary,
];
