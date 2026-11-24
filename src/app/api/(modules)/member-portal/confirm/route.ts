// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/member-portal/api/confirm/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/member-portal/api/confirm/route";

export const POST = gateRouteHandler("member-portal", route.POST);
