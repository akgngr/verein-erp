import "server-only";
import {aiToolV2,defineModuleAiV2} from "@/shared/ai/v2";

import { z } from "zod";

import { can } from "@/shared/permissions/define";

import { studentsPermissions } from "./permissions";
import { getStudentStats } from "./server";

/** Öğrenciler: yalnızca sayılar. Sözleşme: src/shared/ai/define.ts. */
const output=z.object({active:z.number().int(),inactive:z.number().int(),guardians:z.number().int(),withSepaMandate:z.number().int()}).strict();

export const ai = defineModuleAiV2({
  module: "students",
  tools: [
    aiToolV2({
      name: "get_student_statistics",
      operation: "read",
      allowed: (user) => can(user.role, studentsPermissions, "view"),
      description: "Student statistics: active/inactive students, number of guardians and guardians with a SEPA mandate. Counts only.", // i18n-ignore (model-facing tool text)
      input:z.object({}).strict(),result:output,modelOutput:output,
      policy:{"purpose": "students-statistics", "serverReads": ["Student", "StudentGuardian"], "modelFields": ["active", "inactive", "guardians", "withSepaMandate"], "processing": "local_only"},projectForModel:result=>result,
      run: async () => getStudentStats(),
    }),
  ],
  actions: {},
});
