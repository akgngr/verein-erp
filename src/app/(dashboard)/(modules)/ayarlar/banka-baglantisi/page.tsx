// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/banking/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/banking/page";

export * from "@/modules/banking/page";
export default withModuleGate("banking", Page);
