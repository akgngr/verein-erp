// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/sepa/api/[id]/xml/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/sepa/api/[id]/xml/route";

export const GET = gateRouteHandler("sepa", route.GET);
export const runtime = "nodejs";
