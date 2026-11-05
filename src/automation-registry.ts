// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import { isTaskDefinition, taskModuleKey, type TaskDefinition } from "@/shared/automation/define";

import * as usersAutomationExports from "@/modules/users/automation";
import * as systemAutomationExports from "@/modules/system/automation";
import * as mailAutomationExports from "@/modules/mail/automation";
import * as mailingsAutomationExports from "@/modules/mailings/automation";
import * as securitymonitorAutomationExports from "@/modules/security-monitor/automation";

const tasksOf = (moduleKey: string, exports: Record<string, unknown>): TaskDefinition[] =>
  Object.values(exports).filter(isTaskDefinition).map((task) => {
    if (taskModuleKey(task.key) !== moduleKey) throw new Error(`AUTOMATION_TASK_MODULE_MISMATCH: ${task.key}`);
    return task;
  });

/** Modüllerin güvenilir arka plan görevleri (src/modules/<modül>/automation.ts). */
export const moduleAutomationTasks: TaskDefinition[] = [
  ...tasksOf("users", usersAutomationExports),
  ...tasksOf("system", systemAutomationExports),
  ...tasksOf("mail", mailAutomationExports),
  ...tasksOf("mailings", mailingsAutomationExports),
  ...tasksOf("security-monitor", securitymonitorAutomationExports),
];
