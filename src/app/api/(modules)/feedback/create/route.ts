// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/feedback/api/create/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/feedback/api/create/route";

export const POST = gateRouteHandler("feedback", route.POST);
export const runtime = "nodejs";
