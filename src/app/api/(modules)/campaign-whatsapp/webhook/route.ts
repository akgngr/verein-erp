// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/campaign-whatsapp/api/webhook/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/campaign-whatsapp/api/webhook/route";

export const GET = gateRouteHandler("campaign-whatsapp", route.GET);
export const POST = gateRouteHandler("campaign-whatsapp", route.POST);
