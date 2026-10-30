// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/progress/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/progress/page";

export * from "@/modules/progress/page";
export default withModuleGate("progress", Page);
