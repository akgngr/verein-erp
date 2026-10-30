// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/progress/api/report/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/progress/api/report/route";

export const GET = gateRouteHandler("progress", route.GET);
export const runtime = "nodejs";
