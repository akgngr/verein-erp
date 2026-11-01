// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/members/routes/toplu-eposta/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/members/routes/toplu-eposta/page";

export * from "@/modules/members/routes/toplu-eposta/page";
export default withModuleGate("members", Page);
