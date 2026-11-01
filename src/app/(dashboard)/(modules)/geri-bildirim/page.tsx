// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/feedback/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/feedback/page";

export * from "@/modules/feedback/page";
export default withModuleGate("feedback", Page);
