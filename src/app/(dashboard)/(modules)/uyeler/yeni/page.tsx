// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/members/routes/yeni/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/members/routes/yeni/page";

export * from "@/modules/members/routes/yeni/page";
export default withModuleGate("members", Page);
