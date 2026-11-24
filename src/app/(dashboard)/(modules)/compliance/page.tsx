// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/compliance/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/compliance/page";

export * from "@/modules/compliance/page";
export default withModuleGate("compliance", Page);
