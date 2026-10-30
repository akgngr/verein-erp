// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/donations/routes/bagiscilar/yeni/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/donations/routes/bagiscilar/yeni/page";

export * from "@/modules/donations/routes/bagiscilar/yeni/page";
export default withModuleGate("donations", Page);
