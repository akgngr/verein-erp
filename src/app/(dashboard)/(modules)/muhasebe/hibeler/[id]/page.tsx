// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/grants/routes/[id]/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/grants/routes/[id]/page";

export * from "@/modules/grants/routes/[id]/page";
export default withModuleGate("grants", Page);
