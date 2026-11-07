// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/grants/api/[id]/report-pdf/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/grants/api/[id]/report-pdf/route";

export const GET = gateRouteHandler("grants", route.GET);
export const runtime = "nodejs";
