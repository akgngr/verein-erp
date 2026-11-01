// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleDemo } from "@/shared/demo/define";

import { demo as meetingsDemo } from "@/modules/meetings/demo";
import { demo as membersDemo } from "@/modules/members/demo";
import { demo as accountingDemo } from "@/modules/accounting/demo";
import { demo as donationsDemo } from "@/modules/donations/demo";
import { demo as coursesDemo } from "@/modules/courses/demo";
import { demo as eventsDemo } from "@/modules/events/demo";
import { demo as inventoryDemo } from "@/modules/inventory/demo";
import { demo as studentsDemo } from "@/modules/students/demo";
import { demo as tasksDemo } from "@/modules/tasks/demo";

/** Modüllerin örnek veri üreticileri (src/modules/<modül>/demo.ts). */
export const moduleDemoRegistry: ModuleDemo[] = [
  meetingsDemo,
  membersDemo,
  accountingDemo,
  donationsDemo,
  coursesDemo,
  eventsDemo,
  inventoryDemo,
  studentsDemo,
  tasksDemo,
];
