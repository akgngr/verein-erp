// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/courses/routes/hakedisler/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/courses/routes/hakedisler/page";

export * from "@/modules/courses/routes/hakedisler/page";
export default withModuleGate("courses", Page);
