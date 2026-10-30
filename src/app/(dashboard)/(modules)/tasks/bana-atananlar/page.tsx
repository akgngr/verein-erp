// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/tasks/routes/bana-atananlar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/tasks/routes/bana-atananlar/page";

export * from "@/modules/tasks/routes/bana-atananlar/page";
export default withModuleGate("tasks", Page);
