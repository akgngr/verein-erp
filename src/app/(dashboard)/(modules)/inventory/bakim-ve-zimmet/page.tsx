// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/inventory/routes/bakim-ve-zimmet/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/inventory/routes/bakim-ve-zimmet/page";

export * from "@/modules/inventory/routes/bakim-ve-zimmet/page";
export default withModuleGate("inventory", Page);
