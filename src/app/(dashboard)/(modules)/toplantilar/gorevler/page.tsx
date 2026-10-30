// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/meetings/routes/gorevler/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/meetings/routes/gorevler/page";

export * from "@/modules/meetings/routes/gorevler/page";
export default withModuleGate("meetings", Page);
