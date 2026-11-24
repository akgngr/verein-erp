// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleCompliance } from "@/shared/compliance/define";

import { compliance as accountingCompliance } from "@/modules/accounting/compliance";
import { compliance as donationsCompliance } from "@/modules/donations/compliance";
import { compliance as organizationCompliance } from "@/modules/organization/compliance";
import { compliance as coursesCompliance } from "@/modules/courses/compliance";

/** Uyum (Gemeinnützigkeit) metrik sağlayıcıları (src/modules/<modül>/compliance.ts, ADR 0009). */
export const moduleComplianceRegistry: ModuleCompliance[] = [
  accountingCompliance,
  donationsCompliance,
  organizationCompliance,
  coursesCompliance,
];
