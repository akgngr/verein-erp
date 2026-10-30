// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/documents/routes/[id]/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/documents/routes/[id]/page";

export * from "@/modules/documents/routes/[id]/page";
export default withModuleGate("documents", Page);
