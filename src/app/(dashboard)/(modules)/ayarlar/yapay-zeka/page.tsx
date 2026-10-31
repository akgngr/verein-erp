// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/ai/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/ai/page";

export * from "@/modules/ai/page";
export default withModuleGate("ai", Page);
