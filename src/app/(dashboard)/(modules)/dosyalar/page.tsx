// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/exports/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/exports/page";

export * from "@/modules/exports/page";
export default withModuleGate("exports", Page);
