// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/online-forms/routes/ayarlar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/online-forms/routes/ayarlar/page";

export * from "@/modules/online-forms/routes/ayarlar/page";
export default withModuleGate("online-forms", Page);
