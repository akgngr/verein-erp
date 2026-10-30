// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/donations/routes/bildirimler/[id]/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/donations/routes/bildirimler/[id]/page";

export * from "@/modules/donations/routes/bildirimler/[id]/page";
export default withModuleGate("donations", Page);
