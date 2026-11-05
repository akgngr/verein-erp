// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/security-monitor/api/alerts/[id]/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/security-monitor/api/alerts/[id]/route";

export const POST = gateRouteHandler("security-monitor", route.POST);
