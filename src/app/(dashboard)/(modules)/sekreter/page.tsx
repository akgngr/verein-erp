// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/secretary/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/secretary/page";

export * from "@/modules/secretary/page";
export default withModuleGate("secretary", Page);
