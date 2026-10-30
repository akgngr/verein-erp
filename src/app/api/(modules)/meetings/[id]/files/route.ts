// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/meetings/api/[id]/files/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/meetings/api/[id]/files/route";

export const POST = gateRouteHandler("meetings", route.POST);
export const runtime = "nodejs";
