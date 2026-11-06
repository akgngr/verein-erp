// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/calendar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/calendar/page";

export * from "@/modules/calendar/page";
export default withModuleGate("calendar", Page);
