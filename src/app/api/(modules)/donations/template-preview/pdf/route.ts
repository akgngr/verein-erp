// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/donations/api/template-preview/pdf/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/donations/api/template-preview/pdf/route";

export const GET = gateRouteHandler("donations", route.GET);
export const runtime = "nodejs";
