// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { DashboardCardDefinition } from "@/shared/types/dashboard";

import { cards as documentsCards } from "@/modules/documents/cards";
import { cards as meetingsCards } from "@/modules/meetings/cards";
import { cards as membersCards } from "@/modules/members/cards";
import { cards as coursesCards } from "@/modules/courses/cards";
import { cards as progressCards } from "@/modules/progress/cards";
import { cards as studentsCards } from "@/modules/students/cards";

/** Modüllerin panele sunduğu kartlar (src/modules/<modül>/cards/index.ts). */
export const dashboardCards: { moduleKey: string; cards: DashboardCardDefinition[] }[] = [
  { moduleKey: "documents", cards: documentsCards },
  { moduleKey: "meetings", cards: meetingsCards },
  { moduleKey: "members", cards: membersCards },
  { moduleKey: "courses", cards: coursesCards },
  { moduleKey: "progress", cards: progressCards },
  { moduleKey: "students", cards: studentsCards },
];
