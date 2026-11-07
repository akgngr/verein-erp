// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/mailings/routes/ayarlar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/mailings/routes/ayarlar/page";

export * from "@/modules/mailings/routes/ayarlar/page";
export default withModuleGate("mailings", Page);
