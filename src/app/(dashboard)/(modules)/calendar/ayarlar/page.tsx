// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/calendar/routes/ayarlar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/calendar/routes/ayarlar/page";

export * from "@/modules/calendar/routes/ayarlar/page";
export default withModuleGate("calendar", Page);
