// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).
// Kaynak: src/modules/documents/api/files/[fileId]/route.ts
import { gateRouteHandler } from "@/modules/system/server";
import * as route from "@/modules/documents/api/files/[fileId]/route";

export const GET = gateRouteHandler("documents", route.GET);
export const runtime = "nodejs";
