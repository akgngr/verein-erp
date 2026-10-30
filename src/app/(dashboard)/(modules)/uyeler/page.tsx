// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/members/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/members/page";

export * from "@/modules/members/page";
export default withModuleGate("members", Page);
