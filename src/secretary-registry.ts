// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleSecretary } from "@/shared/secretary/define";

import { secretary as documentsSecretary } from "@/modules/documents/secretary";
import { secretary as membersSecretary } from "@/modules/members/secretary";
import { secretary as accountingSecretary } from "@/modules/accounting/secretary";

/** Kişisel sekretere sabah özeti katkısı veren modüller (src/modules/<modül>/secretary.ts). */
export const moduleSecretaryRegistry: ModuleSecretary[] = [
  documentsSecretary,
  membersSecretary,
  accountingSecretary,
];
