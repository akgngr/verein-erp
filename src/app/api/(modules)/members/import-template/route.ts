// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/members/api/import-template/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/members/api/import-template/route";

export const GET = gateRouteHandler("members", route.GET);
export const runtime = "nodejs";
