// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/member-portal/api/receipts/[ref]/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/member-portal/api/receipts/[ref]/route";

export const GET = gateRouteHandler("member-portal", route.GET);
