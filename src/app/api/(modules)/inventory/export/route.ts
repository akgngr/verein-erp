// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/inventory/api/export/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/inventory/api/export/route";

export const GET = gateRouteHandler("inventory", route.GET);
