// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/security-monitor/api/alerts/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/security-monitor/api/alerts/route";

export const GET = gateRouteHandler("security-monitor", route.GET);
export const POST = gateRouteHandler("security-monitor", route.POST);
