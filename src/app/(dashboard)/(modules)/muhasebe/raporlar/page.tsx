// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/routes/raporlar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/accounting/routes/raporlar/page";

export * from "@/modules/accounting/routes/raporlar/page";
export default withModuleGate("accounting", Page);
