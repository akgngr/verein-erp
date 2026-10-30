// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/members/routes/turler/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/members/routes/turler/page";

export * from "@/modules/members/routes/turler/page";
export default withModuleGate("members", Page);
