// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleFormats } from "@/shared/formats/define";

import { formats as exportsFormats } from "@/modules/exports/formats";

/** Modüllerin dosya formatı eklentileri (src/modules/<modül>/formats.ts). */
export const moduleFormatRegistry: ModuleFormats[] = [
  exportsFormats,
];
