// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/routes/gelen-faturalar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/accounting/routes/gelen-faturalar/page";

export * from "@/modules/accounting/routes/gelen-faturalar/page";
export default withModuleGate("accounting", Page);
