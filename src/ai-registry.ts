// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleAi } from "@/shared/ai/define";

import { ai as tasksAi } from "@/modules/tasks/ai";

/** Modüllerin asistana sunduğu araçlar ve onay eylemleri (src/modules/<modül>/ai.ts). */
export const moduleAiRegistry: ModuleAi[] = [
  tasksAi,
];
