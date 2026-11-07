// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/sepa/routes/[id]/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/sepa/routes/[id]/page";

export * from "@/modules/sepa/routes/[id]/page";
export default withModuleGate("sepa", Page);
