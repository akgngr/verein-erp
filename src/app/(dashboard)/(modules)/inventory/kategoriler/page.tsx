// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/inventory/routes/kategoriler/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/inventory/routes/kategoriler/page";

export * from "@/modules/inventory/routes/kategoriler/page";
export default withModuleGate("inventory", Page);
