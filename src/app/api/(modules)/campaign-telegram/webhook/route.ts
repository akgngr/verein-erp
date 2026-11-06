// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/campaign-telegram/api/webhook/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/campaign-telegram/api/webhook/route";

export const POST = gateRouteHandler("campaign-telegram", route.POST);
