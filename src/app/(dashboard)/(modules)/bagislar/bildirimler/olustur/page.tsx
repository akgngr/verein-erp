// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/donations/routes/bildirimler/olustur/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/donations/routes/bildirimler/olustur/page";

export * from "@/modules/donations/routes/bildirimler/olustur/page";
export default withModuleGate("donations", Page);
