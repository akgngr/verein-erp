// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/online-forms/api/[id]/pdf/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/online-forms/api/[id]/pdf/route";

export const GET = gateRouteHandler("online-forms", route.GET);
export const runtime = "nodejs";
