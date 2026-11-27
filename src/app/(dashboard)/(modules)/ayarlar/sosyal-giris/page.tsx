// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/social-login/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/social-login/page";

export * from "@/modules/social-login/page";
export default withModuleGate("social-login", Page);
