// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/members/api/import/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/members/api/import/route";

export const POST = gateRouteHandler("members", route.POST);
export const runtime = "nodejs";
