// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/students/routes/ayarlar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/students/routes/ayarlar/page";

export * from "@/modules/students/routes/ayarlar/page";
export default withModuleGate("students", Page);
