// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/member-portal/public/portal/giris/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/member-portal/public/portal/giris/page";

export * from "@/modules/member-portal/public/portal/giris/page";
export default withModuleGate("member-portal", Page);
