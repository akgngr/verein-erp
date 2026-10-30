// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/documents/api/[id]/files/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/documents/api/[id]/files/route";

export const POST = gateRouteHandler("documents", route.POST);
export const runtime = "nodejs";
