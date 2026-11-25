// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/mailings/api/t/u/[token]/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/mailings/api/t/u/[token]/route";

export const GET = gateRouteHandler("mailings", route.GET);
export const POST = gateRouteHandler("mailings", route.POST);
