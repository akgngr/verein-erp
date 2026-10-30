// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/events/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/events/page";

export * from "@/modules/events/page";
export default withModuleGate("events", Page);
