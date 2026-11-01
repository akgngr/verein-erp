// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/courses/api/payouts/pdf/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/courses/api/payouts/pdf/route";

export const GET = gateRouteHandler("courses", route.GET);
export const runtime = "nodejs";
