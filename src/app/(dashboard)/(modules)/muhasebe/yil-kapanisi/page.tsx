// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/routes/yil-kapanisi/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/accounting/routes/yil-kapanisi/page";

export * from "@/modules/accounting/routes/yil-kapanisi/page";
export default withModuleGate("accounting", Page);
