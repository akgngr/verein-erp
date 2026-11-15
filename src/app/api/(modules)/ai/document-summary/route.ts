// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/ai/api/document-summary/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/ai/api/document-summary/route";

export const POST = gateRouteHandler("ai", route.POST);
export const runtime = "nodejs";
