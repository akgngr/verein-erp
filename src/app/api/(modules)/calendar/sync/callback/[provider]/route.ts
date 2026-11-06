// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/calendar/api/sync/callback/[provider]/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/calendar/api/sync/callback/[provider]/route";

export const GET = gateRouteHandler("calendar", route.GET);
