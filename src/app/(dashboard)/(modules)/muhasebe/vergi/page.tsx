// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/routes/vergi/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/accounting/routes/vergi/page";

export * from "@/modules/accounting/routes/vergi/page";
export default withModuleGate("accounting", Page);
