// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/finance/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/finance/page";

export * from "@/modules/finance/page";
export default withModuleGate("finance", Page);
