// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/donations/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/donations/page";

export * from "@/modules/donations/page";
export default withModuleGate("donations", Page);
