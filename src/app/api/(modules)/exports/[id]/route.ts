// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/exports/api/[id]/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/exports/api/[id]/route";

export const GET = gateRouteHandler("exports", route.GET);
export const runtime = "nodejs";
