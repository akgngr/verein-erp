// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/demo/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/demo/page";

export * from "@/modules/demo/page";
export default withModuleGate("demo", Page);
