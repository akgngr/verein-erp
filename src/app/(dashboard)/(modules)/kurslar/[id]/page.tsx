// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/courses/routes/[id]/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/courses/routes/[id]/page";

export * from "@/modules/courses/routes/[id]/page";
export default withModuleGate("courses", Page);
