// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/meetings/public/oy/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/meetings/public/oy/page";

export * from "@/modules/meetings/public/oy/page";
export default withModuleGate("meetings", Page);
export const dynamic = "force-dynamic";
