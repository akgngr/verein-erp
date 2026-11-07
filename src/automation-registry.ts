// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import { isEventDefinition, isTaskDefinition, taskModuleKey, type EventDefinition, type TaskDefinition } from "@/shared/automation/define";

import * as documentsAutomationExports from "@/modules/documents/automation";
import * as meetingsAutomationExports from "@/modules/meetings/automation";
import * as membersAutomationExports from "@/modules/members/automation";
import * as donationsAutomationExports from "@/modules/donations/automation";
import * as usersAutomationExports from "@/modules/users/automation";
import * as systemAutomationExports from "@/modules/system/automation";
import * as calendarAutomationExports from "@/modules/calendar/automation";
import * as crmAutomationExports from "@/modules/crm/automation";
import * as feedbackAutomationExports from "@/modules/feedback/automation";
import * as mailAutomationExports from "@/modules/mail/automation";
import * as mailingsAutomationExports from "@/modules/mailings/automation";
import * as onlineformsAutomationExports from "@/modules/online-forms/automation";
import * as securitymonitorAutomationExports from "@/modules/security-monitor/automation";
import * as tasksAutomationExports from "@/modules/tasks/automation";

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
  ...tasksOf("documents", documentsAutomationExports),
  ...tasksOf("meetings", meetingsAutomationExports),
  ...tasksOf("members", membersAutomationExports),
  ...tasksOf("donations", donationsAutomationExports),
  ...tasksOf("users", usersAutomationExports),
  ...tasksOf("system", systemAutomationExports),
  ...tasksOf("calendar", calendarAutomationExports),
  ...tasksOf("crm", crmAutomationExports),
  ...tasksOf("feedback", feedbackAutomationExports),
  ...tasksOf("mail", mailAutomationExports),
  ...tasksOf("mailings", mailingsAutomationExports),
  ...tasksOf("online-forms", onlineformsAutomationExports),
  ...tasksOf("security-monitor", securitymonitorAutomationExports),
  ...tasksOf("tasks", tasksAutomationExports),
];

/** Modüllerin yayımladığı olaylar (iş akışı tetikleyicileri). */
export const moduleAutomationEvents: EventDefinition[] = [
  ...eventsOf("documents", documentsAutomationExports),
  ...eventsOf("meetings", meetingsAutomationExports),
  ...eventsOf("members", membersAutomationExports),
  ...eventsOf("donations", donationsAutomationExports),
  ...eventsOf("users", usersAutomationExports),
  ...eventsOf("system", systemAutomationExports),
  ...eventsOf("calendar", calendarAutomationExports),
  ...eventsOf("crm", crmAutomationExports),
  ...eventsOf("feedback", feedbackAutomationExports),
  ...eventsOf("mail", mailAutomationExports),
  ...eventsOf("mailings", mailingsAutomationExports),
  ...eventsOf("online-forms", onlineformsAutomationExports),
  ...eventsOf("security-monitor", securitymonitorAutomationExports),
  ...eventsOf("tasks", tasksAutomationExports),
];
