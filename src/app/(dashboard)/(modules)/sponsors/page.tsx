// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/sponsors/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/sponsors/page";

export * from "@/modules/sponsors/page";
export default withModuleGate("sponsors", Page);
