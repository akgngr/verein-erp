// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/courses/routes/ayarlar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/courses/routes/ayarlar/page";

export * from "@/modules/courses/routes/ayarlar/page";
export default withModuleGate("courses", Page);
