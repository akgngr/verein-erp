// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import type { ModuleRelease } from "@/shared/modules/releases";

import documentsReleases from "@/modules/documents/releases.json";
import meetingsReleases from "@/modules/meetings/releases.json";
import membersReleases from "@/modules/members/releases.json";
import accountingReleases from "@/modules/accounting/releases.json";
import donationsReleases from "@/modules/donations/releases.json";
import organizationReleases from "@/modules/organization/releases.json";
import usersReleases from "@/modules/users/releases.json";
import systemReleases from "@/modules/system/releases.json";
import auditReleases from "@/modules/audit/releases.json";
import authReleases from "@/modules/auth/releases.json";
import aiReleases from "@/modules/ai/releases.json";
import automationReleases from "@/modules/automation/releases.json";
import bankingReleases from "@/modules/banking/releases.json";
import coursesReleases from "@/modules/courses/releases.json";
import demoReleases from "@/modules/demo/releases.json";
import eventsReleases from "@/modules/events/releases.json";
import exportsReleases from "@/modules/exports/releases.json";
import feedbackReleases from "@/modules/feedback/releases.json";
import inventoryReleases from "@/modules/inventory/releases.json";
import mailReleases from "@/modules/mail/releases.json";
import mailingsReleases from "@/modules/mailings/releases.json";
import progressReleases from "@/modules/progress/releases.json";
import studentsReleases from "@/modules/students/releases.json";
import tasksReleases from "@/modules/tasks/releases.json";

/** Modüllerin sürüm notları (src/modules/<modül>/releases.json), en yeni sürüm üstte. */
export const moduleReleases: { moduleKey: string; releases: ModuleRelease[] }[] = [
  { moduleKey: "documents", releases: documentsReleases.releases as ModuleRelease[] },
  { moduleKey: "meetings", releases: meetingsReleases.releases as ModuleRelease[] },
  { moduleKey: "members", releases: membersReleases.releases as ModuleRelease[] },
  { moduleKey: "accounting", releases: accountingReleases.releases as ModuleRelease[] },
  { moduleKey: "donations", releases: donationsReleases.releases as ModuleRelease[] },
  { moduleKey: "organization", releases: organizationReleases.releases as ModuleRelease[] },
  { moduleKey: "users", releases: usersReleases.releases as ModuleRelease[] },
  { moduleKey: "system", releases: systemReleases.releases as ModuleRelease[] },
  { moduleKey: "audit", releases: auditReleases.releases as ModuleRelease[] },
  { moduleKey: "auth", releases: authReleases.releases as ModuleRelease[] },
  { moduleKey: "ai", releases: aiReleases.releases as ModuleRelease[] },
  { moduleKey: "automation", releases: automationReleases.releases as ModuleRelease[] },
  { moduleKey: "banking", releases: bankingReleases.releases as ModuleRelease[] },
  { moduleKey: "courses", releases: coursesReleases.releases as ModuleRelease[] },
  { moduleKey: "demo", releases: demoReleases.releases as ModuleRelease[] },
  { moduleKey: "events", releases: eventsReleases.releases as ModuleRelease[] },
  { moduleKey: "exports", releases: exportsReleases.releases as ModuleRelease[] },
  { moduleKey: "feedback", releases: feedbackReleases.releases as ModuleRelease[] },
  { moduleKey: "inventory", releases: inventoryReleases.releases as ModuleRelease[] },
  { moduleKey: "mail", releases: mailReleases.releases as ModuleRelease[] },
  { moduleKey: "mailings", releases: mailingsReleases.releases as ModuleRelease[] },
  { moduleKey: "progress", releases: progressReleases.releases as ModuleRelease[] },
  { moduleKey: "students", releases: studentsReleases.releases as ModuleRelease[] },
  { moduleKey: "tasks", releases: tasksReleases.releases as ModuleRelease[] },
];
