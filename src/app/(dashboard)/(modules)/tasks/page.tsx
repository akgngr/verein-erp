// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/tasks/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/tasks/page";

export * from "@/modules/tasks/page";
export default withModuleGate("tasks", Page);
