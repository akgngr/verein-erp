// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/security-monitor/api/schedules/[id]/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/security-monitor/api/schedules/[id]/route";

export const PUT = gateRouteHandler("security-monitor", route.PUT);
export const DELETE = gateRouteHandler("security-monitor", route.DELETE);
