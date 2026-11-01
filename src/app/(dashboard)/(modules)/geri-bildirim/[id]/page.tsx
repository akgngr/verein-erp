// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/feedback/routes/[id]/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/feedback/routes/[id]/page";

export * from "@/modules/feedback/routes/[id]/page";
export default withModuleGate("feedback", Page);
