// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/donations/routes/bildirimler/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/donations/routes/bildirimler/page";

export * from "@/modules/donations/routes/bildirimler/page";
export default withModuleGate("donations", Page);
