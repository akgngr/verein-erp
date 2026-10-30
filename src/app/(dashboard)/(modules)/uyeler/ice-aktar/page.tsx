// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/members/routes/ice-aktar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/members/routes/ice-aktar/page";

export * from "@/modules/members/routes/ice-aktar/page";
export default withModuleGate("members", Page);
