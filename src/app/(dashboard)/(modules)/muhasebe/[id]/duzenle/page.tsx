// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/routes/[id]/duzenle/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/accounting/routes/[id]/duzenle/page";

export * from "@/modules/accounting/routes/[id]/duzenle/page";
export default withModuleGate("accounting", Page);
