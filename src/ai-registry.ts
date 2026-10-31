// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleAi } from "@/shared/ai/define";

import { ai as documentsAi } from "@/modules/documents/ai";
import { ai as meetingsAi } from "@/modules/meetings/ai";
import { ai as membersAi } from "@/modules/members/ai";
import { ai as accountingAi } from "@/modules/accounting/ai";
import { ai as donationsAi } from "@/modules/donations/ai";
import { ai as organizationAi } from "@/modules/organization/ai";
import { ai as coursesAi } from "@/modules/courses/ai";
import { ai as eventsAi } from "@/modules/events/ai";
import { ai as exportsAi } from "@/modules/exports/ai";
import { ai as inventoryAi } from "@/modules/inventory/ai";
import { ai as progressAi } from "@/modules/progress/ai";
import { ai as studentsAi } from "@/modules/students/ai";
import { ai as tasksAi } from "@/modules/tasks/ai";

/** Modüllerin asistana sunduğu araçlar ve onay eylemleri (src/modules/<modül>/ai.ts). */
export const moduleAiRegistry: ModuleAi[] = [
  documentsAi,
  meetingsAi,
  membersAi,
  accountingAi,
  donationsAi,
  organizationAi,
  coursesAi,
  eventsAi,
  exportsAi,
  inventoryAi,
  progressAi,
  studentsAi,
  tasksAi,
];
