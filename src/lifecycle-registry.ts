// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleLifecycle } from "@/shared/modules/lifecycle";

import { lifecycle as demoLifecycle } from "@/modules/demo/lifecycle";

/** Modül yaşam döngüsü kancaları (src/modules/<modül>/lifecycle.ts), ör. kapatılırken temizlik. */
export const moduleLifecycleRegistry: ModuleLifecycle[] = [
  demoLifecycle,
];
