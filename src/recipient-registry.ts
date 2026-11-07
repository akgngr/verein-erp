// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleRecipients } from "@/shared/mailings/define";

import { recipients as meetingsRecipients } from "@/modules/meetings/recipients";
import { recipients as membersRecipients } from "@/modules/members/recipients";
import { recipients as eventsRecipients } from "@/modules/events/recipients";
import { recipients as studentsRecipients } from "@/modules/students/recipients";

/** Toplu e-posta alıcı kaynakları (src/modules/<modül>/recipients.ts). */
export const moduleRecipientRegistry: ModuleRecipients[] = [
  meetingsRecipients,
  membersRecipients,
  eventsRecipients,
  studentsRecipients,
];
