// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/banking/api/callback/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/banking/api/callback/route";

export const GET = gateRouteHandler("banking", route.GET);
