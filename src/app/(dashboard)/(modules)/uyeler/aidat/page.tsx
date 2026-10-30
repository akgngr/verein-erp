// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/members/routes/aidat/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/members/routes/aidat/page";

export * from "@/modules/members/routes/aidat/page";
export default withModuleGate("members", Page);
