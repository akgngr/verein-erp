// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/mailings/api/t/o/[token]/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/mailings/api/t/o/[token]/route";

export const GET = gateRouteHandler("mailings", route.GET);
