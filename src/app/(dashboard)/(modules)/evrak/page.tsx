// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/documents/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/documents/page";

export * from "@/modules/documents/page";
export default withModuleGate("documents", Page);
