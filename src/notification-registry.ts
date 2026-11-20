// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleNotifications } from "@/shared/notifications/define";

/** Merkezi bildirim türleri (src/modules/<modül>/notifications.ts, ADR 0006). */
export const moduleNotificationRegistry: ModuleNotifications[] = [];
