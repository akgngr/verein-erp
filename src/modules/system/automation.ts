import "server-only";

// system modülü — worker ve otomasyonlar için sunucu public girişi.
// Next.js / React UI bağımlılıklarını bu girişe taşımayın.
export { getModuleAvailability, listUsableModuleKeys, type ModuleAvailability } from "./services/module-availability";
// Gizlilik ön ayarının yapay zekâ sağlayıcı politikası (#583): ai modülü sağlayıcı seçiminde okur.
export { getAllowedAiProviders, isAiProviderAllowed } from "./services/privacy-policy";

import { z } from "zod";
import { defineTask } from "@/shared/automation/define";

export const systemBackupTask = defineTask({
  key: "system.run_backup",
  version: 1,
  description: "system.run_backup",
  inputSchema: z.object({}).strict(),
  timeoutSeconds: 300,
  retry: { maxAttempts: 2 },
  schedule: {
    input: () => ({}),
    minIntervalMinutes: 60,
    automaticIntervalMinutes: 60,
  },
  handler: async () => {
    const { runScheduledBackupIfDue } = await import("./services/backups");
    return runScheduledBackupIfDue();
  },
});
