// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/meetings/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/meetings/page";

export * from "@/modules/meetings/page";
export default withModuleGate("meetings", Page);
