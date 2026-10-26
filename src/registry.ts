import type { ModuleConfig } from "@/shared/types/module";

import { moduleConfig as authModule } from "@/modules/auth";
import { moduleConfig as auditModule } from "@/modules/audit";
import { moduleConfig as documentsModule } from "@/modules/documents";
import { moduleConfig as meetingsModule } from "@/modules/meetings";
import { moduleConfig as membersModule } from "@/modules/members";
import { moduleConfig as usersModule } from "@/modules/users";

/**
 * Tüm modüllerin moduleConfig dışa aktarımları (3.5 md. 5).
 * Sidebar bu diziden menüyü üretir; yeni modül buraya tek satır eklenir.
 */
export const registry: ModuleConfig[] = [
  documentsModule,
  meetingsModule,
  membersModule,
  usersModule,
  auditModule,
  authModule,
];
