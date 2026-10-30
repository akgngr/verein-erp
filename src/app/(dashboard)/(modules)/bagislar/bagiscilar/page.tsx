// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/donations/routes/bagiscilar/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/donations/routes/bagiscilar/page";

export * from "@/modules/donations/routes/bagiscilar/page";
export default withModuleGate("donations", Page);
