// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/weather/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/weather/page";

export * from "@/modules/weather/page";
export default withModuleGate("weather", Page);
