// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/crm/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/crm/page";

export * from "@/modules/crm/page";
export default withModuleGate("crm", Page);
