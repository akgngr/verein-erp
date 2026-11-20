// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/finance/routes/ayarlar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/finance/routes/ayarlar/page";

export * from "@/modules/finance/routes/ayarlar/page";
export default withModuleGate("finance", Page);
