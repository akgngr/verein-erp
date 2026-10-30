// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/meetings/api/files/[fileId]/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/meetings/api/files/[fileId]/route";

export const GET = gateRouteHandler("meetings", route.GET);
export const runtime = "nodejs";
