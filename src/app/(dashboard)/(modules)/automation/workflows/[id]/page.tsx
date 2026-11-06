// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/automation/routes/workflows/[id]/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/automation/routes/workflows/[id]/page";

export * from "@/modules/automation/routes/workflows/[id]/page";
export default withModuleGate("automation", Page);
