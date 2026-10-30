// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/inventory/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/inventory/page";

export * from "@/modules/inventory/page";
export default withModuleGate("inventory", Page);
