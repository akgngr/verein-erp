// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/grants/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/grants/page";

export * from "@/modules/grants/page";
export default withModuleGate("grants", Page);
