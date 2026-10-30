// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/accounting/page";

export * from "@/modules/accounting/page";
export default withModuleGate("accounting", Page);
