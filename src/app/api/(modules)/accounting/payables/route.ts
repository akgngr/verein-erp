// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/api/payables/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/accounting/api/payables/route";

export const POST = gateRouteHandler("accounting", route.POST);
export const runtime = "nodejs";
