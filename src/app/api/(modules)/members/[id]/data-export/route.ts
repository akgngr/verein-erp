// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/members/api/[id]/data-export/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/members/api/[id]/data-export/route";

export const GET = gateRouteHandler("members", route.GET);
export const runtime = "nodejs";
