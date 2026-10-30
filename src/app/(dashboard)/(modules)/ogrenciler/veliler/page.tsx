// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/students/routes/veliler/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/students/routes/veliler/page";

export * from "@/modules/students/routes/veliler/page";
export default withModuleGate("students", Page);
