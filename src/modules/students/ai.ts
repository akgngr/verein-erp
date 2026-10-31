import "server-only";

import { z } from "zod";

import { NO_INPUT, aiTool, defineModuleAi } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { studentsPermissions } from "./permissions";
import { getStudentStats } from "./server";

/** Öğrenciler: yalnızca sayılar. Sözleşme: src/shared/ai/define.ts. */
export const ai = defineModuleAi({
  module: "students",
  tools: [
    aiTool({
      name: "get_student_statistics",
      operation: "read",
      allowed: (user) => can(user.role, studentsPermissions, "view"),
      description: "Student statistics: active/inactive students, number of guardians and guardians with a SEPA mandate. Counts only.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: NO_INPUT,
      run: async () => getStudentStats(),
    }),
  ],
  actions: {},
});
