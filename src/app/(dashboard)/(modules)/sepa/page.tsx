// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/sepa/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/sepa/page";

export * from "@/modules/sepa/page";
export default withModuleGate("sepa", Page);
