// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/meetings/routes/yeni/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/meetings/routes/yeni/page";

export * from "@/modules/meetings/routes/yeni/page";
export default withModuleGate("meetings", Page);
