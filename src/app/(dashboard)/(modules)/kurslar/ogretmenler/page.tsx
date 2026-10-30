// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/courses/routes/ogretmenler/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/courses/routes/ogretmenler/page";

export * from "@/modules/courses/routes/ogretmenler/page";
export default withModuleGate("courses", Page);
