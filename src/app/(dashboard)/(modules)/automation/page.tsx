// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/automation/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/automation/page";

export * from "@/modules/automation/page";
export default withModuleGate("automation", Page);
