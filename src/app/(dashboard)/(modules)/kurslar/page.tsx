// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/courses/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/courses/page";

export * from "@/modules/courses/page";
export default withModuleGate("courses", Page);
