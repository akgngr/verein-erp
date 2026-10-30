// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/ai/api/chat/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/ai/api/chat/route";

export const POST = gateRouteHandler("ai", route.POST);
export const runtime = "nodejs";
