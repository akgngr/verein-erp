// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import { isEventDefinition, isTaskDefinition, taskModuleKey, type EventDefinition, type TaskDefinition } from "@/shared/automation/define";

import * as membersAutomationExports from "@/modules/members/automation";
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

const eventsOf = (moduleKey: string, exports: Record<string, unknown>): EventDefinition[] =>
  Object.values(exports).filter(isEventDefinition).map((event) => {
    if (taskModuleKey(event.key) !== moduleKey) throw new Error(`AUTOMATION_EVENT_MODULE_MISMATCH: ${event.key}`);
    return event;
  });

/** Modüllerin güvenilir arka plan görevleri (src/modules/<modül>/automation.ts). */
export const moduleAutomationTasks: TaskDefinition[] = [
  ...tasksOf("members", membersAutomationExports),
  ...tasksOf("users", usersAutomationExports),
  ...tasksOf("system", systemAutomationExports),
  ...tasksOf("mail", mailAutomationExports),
  ...tasksOf("mailings", mailingsAutomationExports),
  ...tasksOf("security-monitor", securitymonitorAutomationExports),
];

/** Modüllerin yayımladığı olaylar (iş akışı tetikleyicileri). */
export const moduleAutomationEvents: EventDefinition[] = [
  ...eventsOf("members", membersAutomationExports),
  ...eventsOf("users", usersAutomationExports),
  ...eventsOf("system", systemAutomationExports),
  ...eventsOf("mail", mailAutomationExports),
  ...eventsOf("mailings", mailingsAutomationExports),
  ...eventsOf("security-monitor", securitymonitorAutomationExports),
];
