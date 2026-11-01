// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/routes/cariler/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/accounting/routes/cariler/page";

export * from "@/modules/accounting/routes/cariler/page";
export default withModuleGate("accounting", Page);
