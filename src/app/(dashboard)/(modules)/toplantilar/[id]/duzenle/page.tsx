// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/meetings/routes/[id]/duzenle/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/meetings/routes/[id]/duzenle/page";

export * from "@/modules/meetings/routes/[id]/duzenle/page";
export default withModuleGate("meetings", Page);
