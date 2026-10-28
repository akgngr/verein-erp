import type { ModuleConfig } from "@/shared/types/module";

import { moduleConfig as authModule } from "@/modules/auth";
import { moduleConfig as auditModule } from "@/modules/audit";
import { moduleConfig as documentsModule } from "@/modules/documents";
import { moduleConfig as meetingsModule } from "@/modules/meetings";
import { moduleConfig as membersModule } from "@/modules/members";
import { moduleConfig as usersModule } from "@/modules/users";
import { moduleConfig as accountingModule } from "@/modules/accounting";
import { moduleConfig as donationsModule } from "@/modules/donations";
import { moduleConfig as organizationModule } from "@/modules/organization";
import { moduleConfig as systemModule } from "@/modules/system";

/**
 * Projedeki TÜM kayıtlı modüllerin tam listesi.
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
