// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/events/api/export/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/events/api/export/route";

export const GET = gateRouteHandler("events", route.GET);
