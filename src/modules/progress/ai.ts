import "server-only";

import { z } from "zod";

import { aiTool, defineModuleAi } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { progressPermissions } from "./permissions";
import { getProgressStats } from "./server";

/** Öğrenci takibi: yalnızca istatistik. Sözleşme: src/shared/ai/define.ts. */
export const ai = defineModuleAi({
  module: "progress",
  tools: [
    aiTool({
      name: "get_progress_statistics",
      operation: "read",
      allowed: (user) => can(user.role, progressPermissions, "view"),
      description: "Student progress statistics for the last N days: attendance (present/late/absent/excused, rate %), number of assessments and notes. Counts only.", // i18n-ignore (model-facing tool text)
      schema: z.object({ days: z.number().int().min(1).max(365) }),
      inputSchema: { type: "object", properties: { days: { type: "integer" } }, required: ["days"], additionalProperties: false },
      run: async ({ days }) => getProgressStats(days),
    }),
  ],
  actions: {},
});
