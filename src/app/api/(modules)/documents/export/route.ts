// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/documents/api/export/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/documents/api/export/route";

export const GET = gateRouteHandler("documents", route.GET);
export const runtime = "nodejs";
