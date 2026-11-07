// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/online-forms/public/formular/[token]/page.tsx
import { withModuleGate } from "@/modules/system/server";
import Page from "@/modules/online-forms/public/formular/[token]/page";

export * from "@/modules/online-forms/public/formular/[token]/page";
export default withModuleGate("online-forms", Page);
export const dynamic = "force-dynamic";
