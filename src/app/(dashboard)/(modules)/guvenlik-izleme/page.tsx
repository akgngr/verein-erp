// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/security-monitor/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/security-monitor/page";

export * from "@/modules/security-monitor/page";
export default withModuleGate("security-monitor", Page);
