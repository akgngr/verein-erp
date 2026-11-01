import "server-only";

import { defineLifecycle } from "@/shared/modules/lifecycle";

import { clearDemoData } from "./services/demo-data";

/** Modül kapatılınca tüm demo kayıtları silinir: sistem temiz kalır. */
export const lifecycle = defineLifecycle({
  moduleKey: "demo",
  onDisable: async () => {
    await clearDemoData();
  },
});
