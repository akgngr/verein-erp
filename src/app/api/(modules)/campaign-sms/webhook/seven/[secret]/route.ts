// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/campaign-sms/api/webhook/seven/[secret]/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/campaign-sms/api/webhook/seven/[secret]/route";

export const POST = gateRouteHandler("campaign-sms", route.POST);
