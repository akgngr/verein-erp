// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/courses/routes/odemeler/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/courses/routes/odemeler/page";

export * from "@/modules/courses/routes/odemeler/page";
export default withModuleGate("courses", Page);
