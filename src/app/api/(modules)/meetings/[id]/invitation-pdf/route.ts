// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/meetings/api/[id]/invitation-pdf/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/meetings/api/[id]/invitation-pdf/route";

export const GET = gateRouteHandler("meetings", route.GET);
