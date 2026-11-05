// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/automation/routes/workflows/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/automation/routes/workflows/page";

export * from "@/modules/automation/routes/workflows/page";
export default withModuleGate("automation", Page);
