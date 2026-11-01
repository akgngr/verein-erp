// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/routes/gelen-faturalar/[id]/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/accounting/routes/gelen-faturalar/[id]/page";

export * from "@/modules/accounting/routes/gelen-faturalar/[id]/page";
export default withModuleGate("accounting", Page);
