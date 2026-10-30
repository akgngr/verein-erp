// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/students/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/students/page";

export * from "@/modules/students/page";
export default withModuleGate("students", Page);
