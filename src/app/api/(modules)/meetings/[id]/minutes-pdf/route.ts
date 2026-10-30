// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/meetings/api/[id]/minutes-pdf/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/meetings/api/[id]/minutes-pdf/route";

export const GET = gateRouteHandler("meetings", route.GET);
export const runtime = "nodejs";
