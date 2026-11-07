// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import type { PermissionDefinition } from "@/shared/permissions/define";
import { settingsPermissions, systemPermissions } from "@/shared/permissions/system";

import * as documentsPermissionExports from "@/modules/documents/permissions";
import * as meetingsPermissionExports from "@/modules/meetings/permissions";
import * as membersPermissionExports from "@/modules/members/permissions";
import * as accountingPermissionExports from "@/modules/accounting/permissions";
import * as donationsPermissionExports from "@/modules/donations/permissions";
import * as organizationPermissionExports from "@/modules/organization/permissions";
import * as usersPermissionExports from "@/modules/users/permissions";
import * as systemPermissionExports from "@/modules/system/permissions";
import * as auditPermissionExports from "@/modules/audit/permissions";
import * as authPermissionExports from "@/modules/auth/permissions";
import * as aiPermissionExports from "@/modules/ai/permissions";
import * as automationPermissionExports from "@/modules/automation/permissions";
import * as bankingPermissionExports from "@/modules/banking/permissions";
import * as calendarPermissionExports from "@/modules/calendar/permissions";
import * as calendarapplePermissionExports from "@/modules/calendar-apple/permissions";
import * as calendargooglePermissionExports from "@/modules/calendar-google/permissions";
import * as calendaroutlookPermissionExports from "@/modules/calendar-outlook/permissions";
import * as campaignsmsPermissionExports from "@/modules/campaign-sms/permissions";
import * as campaigntelegramPermissionExports from "@/modules/campaign-telegram/permissions";
import * as campaignwhatsappPermissionExports from "@/modules/campaign-whatsapp/permissions";
import * as coursesPermissionExports from "@/modules/courses/permissions";
import * as crmPermissionExports from "@/modules/crm/permissions";
import * as demoPermissionExports from "@/modules/demo/permissions";
import * as eventsPermissionExports from "@/modules/events/permissions";
import * as exportsPermissionExports from "@/modules/exports/permissions";
import * as feedbackPermissionExports from "@/modules/feedback/permissions";
import * as grantsPermissionExports from "@/modules/grants/permissions";
import * as inventoryPermissionExports from "@/modules/inventory/permissions";
import * as mailPermissionExports from "@/modules/mail/permissions";
import * as mailingsPermissionExports from "@/modules/mailings/permissions";
import * as onlineformsPermissionExports from "@/modules/online-forms/permissions";
import * as progressPermissionExports from "@/modules/progress/permissions";
import * as securitymonitorPermissionExports from "@/modules/security-monitor/permissions";
import * as studentsPermissionExports from "@/modules/students/permissions";
import * as tasksPermissionExports from "@/modules/tasks/permissions";

const isDefinition = (value: unknown): value is PermissionDefinition =>
  typeof value === "object" && value !== null && "resource" in value && "grants" in value;
const definitionsOf = (exports: Record<string, unknown>) => Object.values(exports).filter(isDefinition);

/** Modül → izin kaynakları (definePermissions). Sistem ayarları "system" altında. */
export const permissionResources: { moduleKey: string; definitions: PermissionDefinition[] }[] = [
  { moduleKey: "documents", definitions: definitionsOf(documentsPermissionExports) },
  { moduleKey: "meetings", definitions: definitionsOf(meetingsPermissionExports) },
  { moduleKey: "members", definitions: definitionsOf(membersPermissionExports) },
  { moduleKey: "accounting", definitions: definitionsOf(accountingPermissionExports) },
  { moduleKey: "donations", definitions: definitionsOf(donationsPermissionExports) },
  { moduleKey: "organization", definitions: definitionsOf(organizationPermissionExports) },
  { moduleKey: "users", definitions: definitionsOf(usersPermissionExports) },
  { moduleKey: "system", definitions: definitionsOf(systemPermissionExports) },
  { moduleKey: "audit", definitions: definitionsOf(auditPermissionExports) },
  { moduleKey: "auth", definitions: definitionsOf(authPermissionExports) },
  { moduleKey: "ai", definitions: definitionsOf(aiPermissionExports) },
  { moduleKey: "automation", definitions: definitionsOf(automationPermissionExports) },
  { moduleKey: "banking", definitions: definitionsOf(bankingPermissionExports) },
  { moduleKey: "calendar", definitions: definitionsOf(calendarPermissionExports) },
  { moduleKey: "calendar-apple", definitions: definitionsOf(calendarapplePermissionExports) },
  { moduleKey: "calendar-google", definitions: definitionsOf(calendargooglePermissionExports) },
  { moduleKey: "calendar-outlook", definitions: definitionsOf(calendaroutlookPermissionExports) },
  { moduleKey: "campaign-sms", definitions: definitionsOf(campaignsmsPermissionExports) },
  { moduleKey: "campaign-telegram", definitions: definitionsOf(campaigntelegramPermissionExports) },
  { moduleKey: "campaign-whatsapp", definitions: definitionsOf(campaignwhatsappPermissionExports) },
  { moduleKey: "courses", definitions: definitionsOf(coursesPermissionExports) },
  { moduleKey: "crm", definitions: definitionsOf(crmPermissionExports) },
  { moduleKey: "demo", definitions: definitionsOf(demoPermissionExports) },
  { moduleKey: "events", definitions: definitionsOf(eventsPermissionExports) },
  { moduleKey: "exports", definitions: definitionsOf(exportsPermissionExports) },
  { moduleKey: "feedback", definitions: definitionsOf(feedbackPermissionExports) },
  { moduleKey: "grants", definitions: definitionsOf(grantsPermissionExports) },
  { moduleKey: "inventory", definitions: definitionsOf(inventoryPermissionExports) },
  { moduleKey: "mail", definitions: definitionsOf(mailPermissionExports) },
  { moduleKey: "mailings", definitions: definitionsOf(mailingsPermissionExports) },
  { moduleKey: "online-forms", definitions: definitionsOf(onlineformsPermissionExports) },
  { moduleKey: "progress", definitions: definitionsOf(progressPermissionExports) },
  { moduleKey: "security-monitor", definitions: definitionsOf(securitymonitorPermissionExports) },
  { moduleKey: "students", definitions: definitionsOf(studentsPermissionExports) },
  { moduleKey: "tasks", definitions: definitionsOf(tasksPermissionExports) },
  { moduleKey: "system", definitions: [systemPermissions, settingsPermissions] },
].map((entry, index, all) => ({
  // Aynı kaynak birden fazla yerde dışa aktarılmışsa yalnızca ilk görüldüğü modülde listelenir.
  ...entry,
  definitions: entry.definitions.filter((definition) => !all.slice(0, index).some((other) => other.definitions.some((seen) => seen.resource === definition.resource))),
}));
