// Bu dosya scripts/sync-schemas.ts ve syncModuleRegistry tarafından otomatik üretilir.
// Dışarıdan modül ekleyen AI agentlar veya geliştiriciler elle düzenlemek zorunda değildir.

import type { ModuleConfig } from "@/shared/types/module";

import { moduleConfig as documentsModule } from "@/modules/documents";
import { moduleConfig as meetingsModule } from "@/modules/meetings";
import { moduleConfig as membersModule } from "@/modules/members";
import { moduleConfig as accountingModule } from "@/modules/accounting";
import { moduleConfig as donationsModule } from "@/modules/donations";
import { moduleConfig as organizationModule } from "@/modules/organization";
import { moduleConfig as usersModule } from "@/modules/users";
import { moduleConfig as systemModule } from "@/modules/system";
import { moduleConfig as auditModule } from "@/modules/audit";
import { moduleConfig as authModule } from "@/modules/auth";

/**
 * Projedeki TÜM kayıtlı modüllerin dinamik listesi.
 */
export const allModules: ModuleConfig[] = [
  documentsModule,
  meetingsModule,
  membersModule,
  accountingModule,
  donationsModule,
  organizationModule,
  usersModule,
  systemModule,
  auditModule,
  authModule,
];

/** Geriye dönük uyumluluk için varsayılan registry */
export const registry: ModuleConfig[] = allModules;
