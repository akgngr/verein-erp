// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/mailings/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/mailings/page";

export * from "@/modules/mailings/page";
export default withModuleGate("mailings", Page);
