// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/routes/yeni/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/accounting/routes/yeni/page";

export * from "@/modules/accounting/routes/yeni/page";
export default withModuleGate("accounting", Page);
