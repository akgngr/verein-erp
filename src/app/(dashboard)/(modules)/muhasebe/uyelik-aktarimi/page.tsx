// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/routes/uyelik-aktarimi/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/accounting/routes/uyelik-aktarimi/page";

export * from "@/modules/accounting/routes/uyelik-aktarimi/page";
export default withModuleGate("accounting", Page);
