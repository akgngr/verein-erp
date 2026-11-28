// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/grants/api/[id]/receipts-zip/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/grants/api/[id]/receipts-zip/route";

export const GET = gateRouteHandler("grants", route.GET);
