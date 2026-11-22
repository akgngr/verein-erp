// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/youth-protection/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/youth-protection/page";

export * from "@/modules/youth-protection/page";
export default withModuleGate("youth-protection", Page);
