// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/feedback/api/[id]/screenshot/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/feedback/api/[id]/screenshot/route";

export const GET = gateRouteHandler("feedback", route.GET);
export const runtime = "nodejs";
