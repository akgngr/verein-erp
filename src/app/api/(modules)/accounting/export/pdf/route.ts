// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/accounting/api/export/pdf/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/accounting/api/export/pdf/route";

export const GET = gateRouteHandler("accounting", route.GET);
export const runtime = "nodejs";
